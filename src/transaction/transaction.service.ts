import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { type_transaction, cat_transaction, statut_facture } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async getFinance(adminId: string, options?: { mois?: string; annee?: string }) {
    const where: any = { admin_id: adminId };

    if (options?.mois && options?.annee) {
      const debutMois = new Date(`${options.annee}-${options.mois}-01`);
      const finMois = new Date(debutMois);
      finMois.setMonth(finMois.getMonth() + 1);
      finMois.setDate(0);

      where.date_operation = {
        gte: debutMois,
        lte: finMois,
      };
    } else if (options?.annee) {
      const debutAnnee = new Date(`${options.annee}-01-01`);
      const finAnnee = new Date(`${options.annee}-12-31`);

      where.date_operation = {
        gte: debutAnnee,
        lte: finAnnee,
      };
    }

    const transactions = await this.prisma.transactions.findMany({
      where,
      orderBy: { date_operation: 'desc' },
      include: {
        commandes: {
          select: { id: true, numero: true },
        },
        factures: {
          select: { id: true, numero_facture: true },
        },
      },
    });

    const revenus = transactions
      .filter((t) => t.type === type_transaction.revenu)
      .reduce((sum, t) => sum + Number(t.montant), 0);

    const depenses = transactions
      .filter((t) => t.type === type_transaction.depense)
      .reduce((sum, t) => sum + Number(t.montant), 0);

    const benefice = revenus - depenses;

    const revenusParCategorie = this.groupByCategorie(
      transactions.filter((t) => t.type === type_transaction.revenu),
    );
    const depensesParCategorie = this.groupByCategorie(
      transactions.filter((t) => t.type === type_transaction.depense),
    );

    const evolutionMensuelle = await this.getEvolutionMensuelle(adminId, options?.annee);

    return {
      resume: {
        revenus: Number(revenus.toFixed(2)),
        depenses: Number(depenses.toFixed(2)),
        benefice: Number(benefice.toFixed(2)),
        nombre_transactions: transactions.length,
      },
      repartition: {
        revenus: revenusParCategorie,
        depenses: depensesParCategorie,
      },
      evolution_mensuelle: evolutionMensuelle,
      transactions,
    };
  }

  private groupByCategorie(transactions: any[]) {
    const grouped: Record<string, { total: number; count: number }> = {};

    for (const t of transactions) {
      const cat = t.categorie;
      if (!grouped[cat]) {
        grouped[cat] = { total: 0, count: 0 };
      }
      grouped[cat].total += Number(t.montant);
      grouped[cat].count += 1;
    }

    for (const cat in grouped) {
      grouped[cat].total = Number(grouped[cat].total.toFixed(2));
    }

    return grouped;
  }

  private async getEvolutionMensuelle(adminId: string, annee?: string) {
    const anneeSelectionnee = annee || new Date().getFullYear().toString();

    const transactions = await this.prisma.transactions.findMany({
      where: {
        admin_id: adminId,
        date_operation: {
          gte: new Date(`${anneeSelectionnee}-01-01`),
          lte: new Date(`${anneeSelectionnee}-12-31`),
        },
      },
    });

    const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const evolution = moisLabels.map((label) => ({ mois: label, revenus: 0, depenses: 0, benefice: 0 }));

    for (const t of transactions) {
      const moisIndex = t.date_operation.getMonth();
      const montant = Number(t.montant);

      if (t.type === type_transaction.revenu) {
        evolution[moisIndex].revenus += montant;
      } else {
        evolution[moisIndex].depenses += montant;
      }
    }

    for (const e of evolution) {
      e.revenus = Number(e.revenus.toFixed(2));
      e.depenses = Number(e.depenses.toFixed(2));
      e.benefice = Number((e.revenus - e.depenses).toFixed(2));
    }

    return evolution;
  }

  async create(adminId: string, userId: string, dto: CreateTransactionDto) {
    if (dto.facture_id) {
      const facture = await this.prisma.factures.findFirst({
        where: { id: dto.facture_id, admin_id: adminId },
      });

      if (!facture) {
        throw new ForbiddenException('Facture non trouvée ou non autorisée');
      }
    }

    if (dto.commande_id) {
      const commande = await this.prisma.commandes.findFirst({
        where: { id: dto.commande_id, admin_id: adminId },
      });

      if (!commande) {
        throw new ForbiddenException('Commande non trouvée ou non autorisée');
      }
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      const t = await tx.transactions.create({
        data: {
          type: dto.type,
          categorie: dto.categorie,
          montant: dto.montant,
          description: dto.description,
          commande_id: dto.commande_id,
          facture_id: dto.facture_id,
          date_operation: dto.date_operation ? new Date(dto.date_operation) : new Date(),
          cree_par: userId,
          admin_id: adminId,
        },
        include: {
          commandes: {
            select: { id: true, numero: true },
          },
          factures: {
            select: { id: true, numero_facture: true },
          },
        },
      });

      if (
        dto.type === type_transaction.revenu &&
        dto.categorie === cat_transaction.facture &&
        dto.facture_id
      ) {
        await tx.factures.update({
          where: { id: dto.facture_id },
          data: { statut: statut_facture.payee },
        });
      }

      return t;
    });

    return {
      message: `${dto.type === type_transaction.revenu ? 'Revenu' : 'Dépense'} enregistré avec succès`,
      transaction,
    };
  }

  async findAll(adminId: string, options?: { type?: type_transaction; categorie?: cat_transaction; mois?: string; annee?: string }) {
    const where: any = { admin_id: adminId };

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.categorie) {
      where.categorie = options.categorie;
    }

    if (options?.mois && options?.annee) {
      const debutMois = new Date(`${options.annee}-${options.mois}-01`);
      const finMois = new Date(debutMois);
      finMois.setMonth(finMois.getMonth() + 1);
      finMois.setDate(0);

      where.date_operation = {
        gte: debutMois,
        lte: finMois,
      };
    }

    const transactions = await this.prisma.transactions.findMany({
      where,
      orderBy: { date_operation: 'desc' },
      include: {
        commandes: {
          select: { id: true, numero: true },
        },
        factures: {
          select: { id: true, numero_facture: true },
        },
      },
    });

    return transactions;
  }
}
