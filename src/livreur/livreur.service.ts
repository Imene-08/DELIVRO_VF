import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statut_bon, statut_commande } from '@prisma/client';

@Injectable()
export class LivreurService {
  constructor(private prisma: PrismaService) {}

  async getMesLivraisons(livreurId: string) {
    const bons = await this.prisma.bons_livraison.findMany({
      where: { livreur_id: livreurId },
      include: {
        commandes: {
          select: {
            id: true,
            numero: true,
            client_nom: true,
            client_tel: true,
            client_adresse: true,
            client_region: true,
            note: true,
            lignes_commande: {
              select: {
                id: true,
                produit_nom: true,
                quantite: true,
              },
            },
          },
        },
      },
      orderBy: { cree_le: 'desc' },
    });

    return bons;
  }

  async accepterLivraison(livreurId: string, bonId: string) {
    const bon = await this.prisma.bons_livraison.findFirst({
      where: {
        id: bonId,
        livreur_id: livreurId,
        statut: statut_bon.pris,
      },
    });

    if (!bon) {
      throw new NotFoundException('Livraison non trouvée ou non assignée');
    }

    const updated = await this.prisma.bons_livraison.update({
      where: { id: bonId },
      data: {
        statut: statut_bon.pris,
        date_prise_en_charge: new Date(),
      },
      include: {
        commandes: {
          select: {
            id: true,
            numero: true,
            client_nom: true,
            client_tel: true,
            client_adresse: true,
          },
        },
      },
    });

    return {
      message: 'Livraison acceptée',
      bon_livraison: updated,
    };
  }

  async refuserLivraison(livreurId: string, bonId: string, motif?: string) {
    const bon = await this.prisma.bons_livraison.findFirst({
      where: {
        id: bonId,
        livreur_id: livreurId,
        statut: statut_bon.pris,
      },
      include: {
        commandes: true,
      },
    });

    if (!bon) {
      throw new NotFoundException('Livraison non trouvée ou non assignée');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bons_livraison.update({
        where: { id: bonId },
        data: {
          livreur_id: undefined,
          statut: statut_bon.en_attente,
          date_prise_en_charge: null,
          resultat: 'refuse',
          note_livreur: motif || 'Refusé par le livreur',
        },
      });

      await tx.livreurs_free.updateMany({
        where: { compte_id: livreurId },
        data: { disponible: true },
      });
    });

    return {
      message: 'Livraison refusée',
      bon_id: bonId,
    };
  }

  async marquerLivree(livreurId: string, bonId: string) {
    const bon = await this.prisma.bons_livraison.findFirst({
      where: {
        id: bonId,
        livreur_id: livreurId,
        statut: statut_bon.pris,
      },
      include: {
        commandes: true,
      },
    });

    if (!bon) {
      throw new NotFoundException('Livraison non trouvée');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bons_livraison.update({
        where: { id: bonId },
        data: {
          statut: statut_bon.livre,
          resultat: 'livre',
          date_resolution: new Date(),
        },
      });

      await tx.commandes.update({
        where: { id: bon.commande_id },
        data: { statut: statut_commande.livree },
      });

      await tx.livreurs_free.updateMany({
        where: { compte_id: livreurId },
        data: { disponible: true },
      });
    });

    return {
      message: 'Livraison marquée comme livrée',
      bon_id: bonId,
    };
  }

  async marquerRetour(livreurId: string, bonId: string, motif?: string) {
    const bon = await this.prisma.bons_livraison.findFirst({
      where: {
        id: bonId,
        livreur_id: livreurId,
        statut: statut_bon.pris,
      },
      include: {
        commandes: true,
      },
    });

    if (!bon) {
      throw new NotFoundException('Livraison non trouvée');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bons_livraison.update({
        where: { id: bonId },
        data: {
          statut: statut_bon.livre,
          resultat: 'retour',
          date_resolution: new Date(),
          motif_retour: motif || 'Retour client',
        },
      });

      await tx.commandes.update({
        where: { id: bon.commande_id },
        data: { statut: statut_commande.retour },
      });

      await tx.livreurs_free.updateMany({
        where: { compte_id: livreurId },
        data: { disponible: true },
      });
    });

    return {
      message: 'Livraison marquée comme retour',
      bon_id: bonId,
    };
  }
}
