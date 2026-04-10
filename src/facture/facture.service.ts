import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statut_facture, type_transaction, cat_transaction } from '@prisma/client';

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
          select: { id: true, montant: true, type: true },
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

  async marquerPayee(factureId: string, adminId: string, userId: string) {
    const facture = await this.prisma.factures.findFirst({
      where: { id: factureId, admin_id: adminId },
    });

    if (!facture) {
      throw new NotFoundException('Facture non trouvée');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.factures.update({
        where: { id: factureId },
        data: { statut: statut_facture.payee },
      });

      const transaction = await tx.transactions.create({
        data: {
          type: type_transaction.revenu,
          categorie: cat_transaction.facture,
          montant: facture.montant_total,
          description: `Paiement facture ${facture.numero_facture}`,
          facture_id: factureId,
          commande_id: facture.commande_id,
          date_operation: new Date(),
          cree_par: userId,
          admin_id: adminId,
        },
      });

      return { facture: updated, transaction };
    });

    return {
      message: 'Facture marquée comme payée',
      facture: result.facture,
      transaction: result.transaction,
    };
  }
}
