import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { role_compte, statut_compte, statut_abonnement, statut_facture } from '@prisma/client';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalAdmins,
      totalEmployes,
      totalLivreurs,
      adminsActifs,
      totalCommandes,
      commandesLivrees,
      abonnementsActifs,
      facturesEmises,
      facturesPayees,
    ] = await Promise.all([
      this.prisma.comptes.count({ where: { role: role_compte.admin } }),
      this.prisma.comptes.count({ where: { role: role_compte.employe } }),
      this.prisma.comptes.count({ where: { role: role_compte.livreur } }),
      this.prisma.comptes.count({ where: { role: role_compte.admin, statut: statut_compte.actif } }),
      this.prisma.commandes.count(),
      this.prisma.commandes.count({ where: { statut: 'livree' } }),
      // MRR : somme des prix_mensuel des abonnements actifs
      this.prisma.abonnements.findMany({
        where: { statut: statut_abonnement.actif },
        select: { prix_mensuel: true },
      }),
      // Taux de recouvrement : montant total factures émises
      this.prisma.factures.aggregate({
        where: { statut: { in: [statut_facture.envoyee, statut_facture.payee] } },
        _sum: { montant_ttc: true },
      }),
      // Montant factures payées
      this.prisma.factures.aggregate({
        where: { statut: statut_facture.payee },
        _sum: { montant_ttc: true },
      }),
    ]);

    const mrr = abonnementsActifs.reduce((sum, a) => sum + Number(a.prix_mensuel), 0);

    const totalEmis = Number(facturesEmises._sum.montant_ttc || 0);
    const totalPaye = Number(facturesPayees._sum.montant_ttc || 0);
    const tauxRecouvrement = totalEmis > 0 ? Number(((totalPaye / totalEmis) * 100).toFixed(2)) : 0;

    // Abonnements par plan
    const abonnementsByPlan = await this.prisma.abonnements.groupBy({
      by: ['plan'],
      _count: true,
      _sum: { prix_mensuel: true },
    });

    // Abonnements expirant dans 7 jours
    const in7days = new Date();
    in7days.setDate(in7days.getDate() + 7);
    const expirantBientot = await this.prisma.abonnements.count({
      where: {
        statut: statut_abonnement.actif,
        date_echeance: { lte: in7days },
      },
    });

    return {
      utilisateurs: {
        total_admins: totalAdmins,
        total_employes: totalEmployes,
        total_livreurs: totalLivreurs,
        admins_actifs: adminsActifs,
      },
      commandes: {
        total: totalCommandes,
        livrees: commandesLivrees,
        taux_livraison:
          totalCommandes > 0
            ? Number(((commandesLivrees / totalCommandes) * 100).toFixed(2))
            : 0,
      },
      finance: {
        mrr: Number(mrr.toFixed(2)),
        taux_recouvrement: tauxRecouvrement,
        total_facture: Number(totalEmis.toFixed(2)),
        total_encaisse: Number(totalPaye.toFixed(2)),
      },
      abonnements: {
        actifs: abonnementsActifs.length,
        expirant_dans_7j: expirantBientot,
        repartition_plans: abonnementsByPlan.map((p) => ({
          plan: p.plan,
          nombre: p._count,
          mrr_contribution: Number(p._sum.prix_mensuel || 0),
        })),
      },
    };
  }

  async createSuperAdmin(dto: CreateSuperAdminDto) {
    const existing = await this.prisma.comptes.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(dto.mot_de_passe, 10);

    const superAdmin = await this.prisma.comptes.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        telephone: dto.telephone,
        mot_de_passe: hashedPassword,
        role: role_compte.super_admin,
        statut: statut_compte.actif,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        statut: true,
        cree_le: true,
      },
    });

    return superAdmin;
  }

  async findAllLivreurs() {
    const livreurs = await this.prisma.comptes.findMany({
      where: { role: role_compte.livreur },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        statut: true,
        cree_le: true,
        admin_parent_id: true,
        comptes: {
          select: { nom: true, email: true },
        },
        livraisons_livreurs: {
          select: {
            assigne_le: true,
            bons_livraison: {
              select: { id: true, statut: true, client_nom: true, client_ville: true },
            },
          },
        },
      },
      orderBy: { cree_le: 'desc' },
    });

    return {
      total: livreurs.length,
      livreurs: livreurs.map((l) => ({
        id: l.id,
        nom: `${l.prenom || ''} ${l.nom}`.trim(),
        email: l.email,
        telephone: l.telephone,
        statut: l.statut,
        admin_parent: l.comptes
          ? { id: l.admin_parent_id, nom: l.comptes.nom, email: l.comptes.email }
          : null,
        livraisons_en_cours: l.livraisons_livreurs.map((ll) => ll.bons_livraison),
        cree_le: l.cree_le,
      })),
    };
  }
}
