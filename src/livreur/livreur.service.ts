import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LivreurService {
  constructor(private prisma: PrismaService) {}

  async getMesLivraisons(livreurId: string) {
    const bons = await this.prisma.bons_livraison.findMany({
      where: {
        livraisons_livreurs: { some: { livreur_id: livreurId } },
      },
      include: {
        commandes: {
          include: {
            clients: { select: { nom: true, telephone: true, adresse: true, ville: true } },
            lignes_commande: {
              include: { produits: { select: { nom: true, reference: true } } },
            },
          },
        },
        livraisons_livreurs: {
          where: { livreur_id: livreurId },
          select: { assigne_le: true },
        },
      },
      orderBy: { cree_le: 'desc' },
    });

    return { total: bons.length, livraisons: bons };
  }
}
