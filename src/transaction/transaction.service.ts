import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { type_transaction, categorie_transaction } from '@prisma/client';
import { CreateDepenseDto } from './dto/create-depense.dto';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async getFinance(adminId: string, options?: { mois?: string; annee?: string }) {
    const where: any = { admin_id: adminId };

    if (options?.mois && options?.annee) {
      const mois = options.mois.padStart(2, '0');
      const debutMois = new Date(`${options.annee}-${mois}-01`);
      const finMois = new Date(debutMois);
      finMois.setMonth(finMois.getMonth() + 1);
      finMois.setDate(0);
      where.date_operation = { gte: debutMois, lte: finMois };
    } else if (options?.annee) {
      where.date_operation = {
        gte: new Date(`${options.annee}-01-01`),
        lte: new Date(`${options.annee}-12-31`),
      };
    }

    const transactions = await this.prisma.transactions.findMany({
      where,
      orderBy: { date_operation: 'desc' },
      include: {
        commandes: { select: { id: true, numero: true } },
      },
    });

    const revenus = transactions.filter((t) => t.type === type_transaction.revenu).reduce((s, t) => s + Number(t.montant), 0);
    const depenses = transactions.filter((t) => t.type === type_transaction.depense).reduce((s, t) => s + Number(t.montant), 0);

    return {
      resume: {
        revenus: Number(revenus.toFixed(2)),
        depenses: Number(depenses.toFixed(2)),
        benefice: Number((revenus - depenses).toFixed(2)),
        nombre_transactions: transactions.length,
      },
      transactions,
    };
  }

  async createDepense(adminId: string, dto: CreateDepenseDto) {
    const transaction = await this.prisma.transactions.create({
      data: {
        type: type_transaction.depense,
        categorie: dto.categorie ?? categorie_transaction.autre,
        montant: dto.montant,
        description: dto.description,
        date_operation: dto.date_operation ? new Date(dto.date_operation) : new Date(),
        cree_par: adminId,
        admin_id: adminId,
      },
    });

    return { message: 'Dépense enregistrée avec succès', transaction };
  }

  async getBilan(adminId: string, annee?: string) {
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
    const bilan = moisLabels.map((mois, i) => ({
      mois,
      numero_mois: i + 1,
      revenus: 0,
      depenses: 0,
      benefice: 0,
    }));

    for (const t of transactions) {
      const idx = new Date(t.date_operation).getMonth();
      const montant = Number(t.montant);
      if (t.type === type_transaction.revenu) {
        bilan[idx].revenus += montant;
      } else {
        bilan[idx].depenses += montant;
      }
    }

    for (const b of bilan) {
      b.revenus = Number(b.revenus.toFixed(2));
      b.depenses = Number(b.depenses.toFixed(2));
      b.benefice = Number((b.revenus - b.depenses).toFixed(2));
    }

    const totalRevenus = bilan.reduce((s, b) => s + b.revenus, 0);
    const totalDepenses = bilan.reduce((s, b) => s + b.depenses, 0);

    return {
      annee: anneeSelectionnee,
      total_revenus: Number(totalRevenus.toFixed(2)),
      total_depenses: Number(totalDepenses.toFixed(2)),
      benefice_annuel: Number((totalRevenus - totalDepenses).toFixed(2)),
      bilan_mensuel: bilan,
    };
  }
}
