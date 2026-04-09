import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statut_facture } from '@prisma/client';

@Injectable()
export class FactureService {
  constructor(private prisma: PrismaService) {}

  async findAll(adminId: string, options?: { statut?: statut_facture; clientId?: string; search?: string }) {
    const where: any = { admin_id: adminId };

    if (options?.statut) {
      where.statut = options.statut;
    }

    if (options?.clientId) {
      where.client_id = options.clientId;
    }

    if (options?.search) {
      where.OR = [
        { client_nom: { contains: options.search, mode: 'insensitive' } },
        { client_tel: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const factures = await this.prisma.factures.findMany({
      where,
      include: {
        clients: {
          select: { id: true, nom: true, telephone: true },
        },
        commandes: {
          select: { id: true, numero: true, statut: true },
        },
        transactions: {
          select: { id: true, montant: true, type: true, statut: true },
        },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { cree_le: 'desc' },
    });

    return factures;
  }

  async findOne(adminId: string, factureId: string) {
    const facture = await this.prisma.factures.findFirst({
      where: { id: factureId, admin_id: adminId },
      include: {
        clients: {
          select: { id: true, nom: true, telephone: true, adresse: true },
        },
        commandes: {
          select: {
            id: true,
            numero: true,
            statut: true,
            lignes_commande: {
              select: {
                id: true,
                produit_nom: true,
                quantite: true,
                prix_unitaire: true,
                sous_total: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { cree_le: 'desc' },
        },
      },
    });

    if (!facture) {
      throw new NotFoundException('Facture non trouvée');
    }

    return facture;
  }
}
