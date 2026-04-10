import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statut_commande } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getStatsByRegion(adminId: string) {
    const rows = await this.prisma.commandes.groupBy({
      by: ['client_region', 'statut'],
      where: {
        admin_id: adminId,
        client_region: { not: null },
      },
      _count: { id: true },
      _sum: { total_dt: true },
    });

    const regionMap = new Map<string, {
      total: number;
      chiffre_affaires: number;
      statuts: Partial<Record<statut_commande, number>>;
    }>();

    for (const row of rows) {
      const region = row.client_region!;
      if (!regionMap.has(region)) {
        regionMap.set(region, { total: 0, chiffre_affaires: 0, statuts: {} });
      }
      const r = regionMap.get(region)!;
      r.total += row._count.id;
      r.chiffre_affaires += Number(row._sum.total_dt || 0);
      if (row.statut) {
        r.statuts[row.statut] = row._count.id;
      }
    }

    const details = Array.from(regionMap.entries()).map(([region, data]) => {
      const panier_moyen = data.total > 0 ? data.chiffre_affaires / data.total : 0;
      const s = data.statuts;

      return {
        region,
        total_commandes: data.total,
        chiffre_affaires: Number(data.chiffre_affaires.toFixed(2)),
        panier_moyen: Number(panier_moyen.toFixed(2)),
        repartition_statuts: {
          livrees: s[statut_commande.livree] ?? 0,
          en_cours: (s[statut_commande.en_livraison] ?? 0) + (s[statut_commande.confirmee] ?? 0),
          annulees: (s[statut_commande.annulee] ?? 0) + (s[statut_commande.retour] ?? 0),
          brouillon: s[statut_commande.brouillon] ?? 0,
        },
      };
    });

    return {
      total_regions: details.length,
      regions: details.sort((a, b) => b.chiffre_affaires - a.chiffre_affaires),
    };
  }

  async getStatsByCategorie(adminId: string) {
    const categories = await this.prisma.categories.findMany({
      where: { admin_id: adminId },
      include: {
        produits: {
          select: {
            id: true,
            lignes_commande: {
              select: {
                quantite: true,
                sous_total: true,
              },
            },
          },
        },
      },
    });

    const statsCategories = categories.map((cat) => {
      const nbProduits = cat.produits.length;
      const nbVentes = cat.produits.reduce(
        (sum, p) => sum + p.lignes_commande.reduce((s, l) => s + l.quantite, 0),
        0,
      );
      const ca = cat.produits.reduce(
        (sum, p) =>
          sum + p.lignes_commande.reduce((s, l) => s + Number(l.sous_total || 0), 0),
        0,
      );

      return {
        categorie_id: cat.id,
        categorie_nom: cat.nom,
        description: cat.description,
        nombre_produits: nbProduits,
        nombre_ventes: nbVentes,
        chiffre_affaires: Number(ca.toFixed(2)),
      };
    });

    return {
      total_categories: statsCategories.length,
      categories: statsCategories.sort((a, b) => b.chiffre_affaires - a.chiffre_affaires),
    };
  }

  async getStatsGlobales(adminId: string) {
    const [commandes, produits, clients, livraisons] = await Promise.all([
      this.prisma.commandes.aggregate({
        where: { admin_id: adminId },
        _count: { id: true },
        _sum: { total_dt: true },
      }),
      this.prisma.produits.count({ where: { admin_id: adminId } }),
      this.prisma.clients.count({ where: { admin_id: adminId } }),
      this.prisma.bons_livraison.count({ where: { admin_id: adminId } }),
    ]);

    const commandesParStatut = await this.prisma.commandes.groupBy({
      by: ['statut'],
      where: { admin_id: adminId },
      _count: { id: true },
    });

    return {
      resume: {
        total_commandes: commandes._count.id,
        chiffre_affaires_total: Number(commandes._sum.total_dt || 0),
        total_produits: produits,
        total_clients: clients,
        total_livraisons: livraisons,
      },
      commandes_par_statut: commandesParStatut.reduce((acc, c) => {
        if (c.statut) {
          acc[c.statut] = c._count.id;
        }
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
