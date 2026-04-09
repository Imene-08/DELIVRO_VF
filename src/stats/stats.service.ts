import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statut_commande } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getStatsByRegion(adminId: string) {
    const commandes = await this.prisma.commandes.groupBy({
      by: ['client_region'],
      where: {
        admin_id: adminId,
        client_region: { not: null },
      },
      _count: { id: true },
      _sum: { total_dt: true },
      _avg: { total_dt: true },
    });

    const details = await Promise.all(
      commandes.map(async (c) => {
        const commandesRegion = await this.prisma.commandes.findMany({
          where: {
            admin_id: adminId,
            client_region: c.client_region,
          },
          select: {
            statut: true,
          },
        });

        const livrees = commandesRegion.filter((cmd) => cmd.statut === statut_commande.livree).length;
        const enCours = commandesRegion.filter(
          (cmd) =>
            cmd.statut === statut_commande.en_livraison ||
            cmd.statut === statut_commande.confirmee,
        ).length;
        const annulees = commandesRegion.filter(
          (cmd) =>
            cmd.statut === statut_commande.annulee || cmd.statut === statut_commande.retour,
        ).length;

        return {
          region: c.client_region,
          total_commandes: c._count.id,
          chiffre_affaires: Number(c._sum.total_dt || 0),
          panier_moyen: Number(c._avg.total_dt?.toFixed(2) || 0),
          repartition_statuts: {
            livrees,
            en_cours: enCours,
            annulees,
            brouillon: commandesRegion.filter((cmd) => cmd.statut === statut_commande.brouillon).length,
          },
        };
      }),
    );

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
