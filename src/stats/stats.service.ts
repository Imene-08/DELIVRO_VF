import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statut_commande } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getStatsGlobales(adminId: string, options?: { debut?: string; fin?: string }) {
    const where: any = { admin_id: adminId };

    if (options?.debut || options?.fin) {
      where.cree_le = {};
      if (options.debut) where.cree_le.gte = new Date(options.debut);
      if (options.fin) where.cree_le.lte = new Date(options.fin);
    }

    const [totalCommandes, totalProduits, totalClients, totalLivraisons] = await Promise.all([
      this.prisma.commandes.aggregate({ where, _count: true, _sum: { total_ht: true } }),
      this.prisma.produits.count({ where: { admin_id: adminId } }),
      this.prisma.clients.count({ where: { admin_id: adminId } }),
      this.prisma.bons_livraison.count({ where: { admin_id: adminId } }),
    ]);

    const commandesParStatut = await this.prisma.commandes.groupBy({
      by: ['statut'],
      where,
      _count: true,
    });

    return {
      chiffre_affaires_total: Number(totalCommandes._sum.total_ht || 0),
      total_commandes: totalCommandes._count,
      total_produits: totalProduits,
      total_clients: totalClients,
      total_livraisons: totalLivraisons,
      commandes_par_statut: commandesParStatut.reduce((acc, c) => {
        if (c.statut) acc[c.statut] = c._count;
        return acc;
      }, {} as Record<string, number>),
      periode: options?.debut || options?.fin ? { debut: options.debut, fin: options.fin } : 'toutes périodes',
    };
  }

  async getStatsByRegion(adminId: string) {
    // Agrège par ville du client
    const commandes = await this.prisma.commandes.findMany({
      where: { admin_id: adminId },
      include: {
        clients: { select: { ville: true } },
      },
    });

    const villeMap = new Map<string, { total: number; ca: number; statuts: Record<string, number> }>();

    for (const cmd of commandes) {
      const ville = cmd.clients?.ville || 'Non renseignée';
      if (!villeMap.has(ville)) villeMap.set(ville, { total: 0, ca: 0, statuts: {} });
      const v = villeMap.get(ville)!;
      v.total += 1;
      v.ca += Number(cmd.total_ht || 0);
      if (cmd.statut) v.statuts[cmd.statut] = (v.statuts[cmd.statut] || 0) + 1;
    }

    const regions = Array.from(villeMap.entries()).map(([ville, data]) => ({
      region: ville,
      total_commandes: data.total,
      chiffre_affaires: Number(data.ca.toFixed(2)),
      panier_moyen: data.total > 0 ? Number((data.ca / data.total).toFixed(2)) : 0,
      repartition_statuts: data.statuts,
    }));

    return {
      total_regions: regions.length,
      regions: regions.sort((a, b) => b.chiffre_affaires - a.chiffre_affaires),
    };
  }

  async getStatsByCategorie(adminId: string) {
    const categories = await this.prisma.categories.findMany({
      where: { admin_id: adminId },
      include: {
        produits: {
          select: {
            id: true,
            lignes_commande: { select: { quantite: true, sous_total: true } },
          },
        },
      },
    });

    const stats = categories.map((cat) => {
      const nbVentes = cat.produits.reduce((sum, p) => sum + p.lignes_commande.reduce((s, l) => s + l.quantite, 0), 0);
      const ca = cat.produits.reduce((sum, p) => sum + p.lignes_commande.reduce((s, l) => s + Number(l.sous_total || 0), 0), 0);
      return {
        categorie_id: cat.id,
        categorie_nom: cat.nom,
        nombre_produits: cat.produits.length,
        nombre_ventes: nbVentes,
        chiffre_affaires: Number(ca.toFixed(2)),
      };
    });

    return {
      total_categories: stats.length,
      categories: stats.sort((a, b) => b.chiffre_affaires - a.chiffre_affaires),
    };
  }

  async getTopProduits(adminId: string, options: { limit: number; region?: string }) {
    const lignes = await this.prisma.lignes_commande.findMany({
      where: {
        commandes: {
          admin_id: adminId,
          statut: statut_commande.livree,
          ...(options.region && { clients: { ville: options.region } }),
        },
      },
      include: {
        produits: {
          select: { id: true, nom: true, reference: true, categories: { select: { nom: true } } },
        },
      },
    });

    const produitMap = new Map<string, { produit_id: string; nom: string; reference: string | null; categorie: string | null; quantite_vendue: number; chiffre_affaires: number }>();

    for (const ligne of lignes) {
      const pid = ligne.produit_id;
      if (!produitMap.has(pid)) {
        produitMap.set(pid, {
          produit_id: pid,
          nom: ligne.produits?.nom ?? 'Produit inconnu',
          reference: ligne.produits?.reference ?? null,
          categorie: ligne.produits?.categories?.nom ?? null,
          quantite_vendue: 0,
          chiffre_affaires: 0,
        });
      }
      const p = produitMap.get(pid)!;
      p.quantite_vendue += ligne.quantite;
      p.chiffre_affaires += Number(ligne.sous_total || 0);
    }

    const top = Array.from(produitMap.values())
      .sort((a, b) => b.chiffre_affaires - a.chiffre_affaires)
      .slice(0, options.limit)
      .map((p, i) => ({ rang: i + 1, ...p, chiffre_affaires: Number(p.chiffre_affaires.toFixed(2)) }));

    return {
      total_produits: top.length,
      filtre_region: options.region ?? 'toutes régions',
      top_produits: top,
    };
  }
}
