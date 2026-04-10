
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { role_compte, statut_abo, plan_abo, statut_compte, statut_bon } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  async findAllAdmins() {
    return this.prisma.comptes.findMany({
      where: { role: role_compte.admin },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        statut: true,
        cree_le: true,
        modifie_le: true,
        abonnements: {
          select: {
            id: true,
            plan: true,
            prix_mensuel: true,
            statut: true,
            date_echeance: true,
          },
        },
      },
      orderBy: { cree_le: 'desc' },
    });
  }

  async createAdmin(superAdminId: string, dto: CreateAdminDto) {
    const existingUser = await this.prisma.comptes.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(dto.mot_de_passe, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const compte = await tx.comptes.create({
        data: {
          nom: dto.nom,
          prenom: dto.prenom,
          email: dto.email,
          telephone: dto.telephone,
          mot_de_passe: hashedPassword,
          role: role_compte.admin,
          statut: 'actif',
          cree_par_super: superAdminId,
        },
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          statut: true,
          cree_le: true,
        },
      });

      const abonnement = await tx.abonnements.create({
        data: {
          admin_id: compte.id,
          plan: dto.plan,
          prix_mensuel: dto.prix_mensuel,
          statut: dto.statut_abonnement ?? statut_abo.en_retard,
          date_debut: dto.date_debut ? new Date(dto.date_debut) : new Date(),
          date_echeance: new Date(dto.date_echeance),
          renouvellement_auto: dto.renouvellement_auto ?? true,
          note: dto.note_abonnement,
        },
        select: {
          id: true,
          plan: true,
          prix_mensuel: true,
          statut: true,
          date_debut: true,
          date_echeance: true,
          renouvellement_auto: true,
        },
      });

      return { compte, abonnement };
    });

    return {
      message: 'Admin créé avec succès',
      admin: result.compte,
      abonnement: result.abonnement,
    };
  }

  async suspendreAdminCascade(adminId: string) {
    const admin = await this.prisma.comptes.findFirst({
      where: { id: adminId, role: role_compte.admin },
      select: { id: true, statut: true, nom: true, email: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin non trouvé');
    }

    if (admin.statut === statut_compte.suspendu) {
      throw new ConflictException('Ce compte est déjà suspendu');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedAdmin = await tx.comptes.update({
        where: { id: adminId },
        data: { statut: statut_compte.suspendu },
        select: {
          id: true,
          nom: true,
          email: true,
          statut: true,
        },
      });

      const updatedEmployes = await tx.comptes.updateMany({
        where: {
          admin_parent_id: adminId,
          role: role_compte.employe,
        },
        data: { statut: statut_compte.suspendu },
      });

      const updatedLivreurs = await tx.comptes.updateMany({
        where: {
          admin_parent_id: adminId,
          role: role_compte.livreur,
        },
        data: { statut: statut_compte.suspendu },
      });

      return {
        admin: updatedAdmin,
        employesSuspendus: updatedEmployes.count,
        livreursSuspendus: updatedLivreurs.count,
      };
    });

    return {
      message: 'Suspension effectuée avec succès',
      admin: result.admin,
      cascade: {
        employes_suspendus: result.employesSuspendus,
        livreurs_suspendus: result.livreursSuspendus,
      },
    };
  }

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      totalAdmins,
      totalEmployes,
      totalLivreurs,
      activeAdmins,
      pendingBons,
      deliveredBons,
      monthlyRevenue,
      abonnementsActifs,
      abonnementsEnRetard,
      paiementsThisMonth,
    ] = await Promise.all([
      this.prisma.comptes.count({ where: { role: role_compte.admin } }),
      this.prisma.comptes.count({ where: { role: role_compte.employe } }),
      this.prisma.comptes.count({ where: { role: role_compte.livreur } }),
      this.prisma.comptes.count({
        where: { role: role_compte.admin, statut: statut_compte.actif },
      }),
      this.prisma.bons_livraison.count({
        where: { statut: { in: [statut_bon.en_attente, statut_bon.pris] } },
      }),
      this.prisma.bons_livraison.count({ where: { statut: 'livre' } }),
      this.prisma.abonnements.aggregate({
        where: { statut: statut_abo.actif },
        _sum: { prix_mensuel: true },
      }),
      this.prisma.abonnements.count({ where: { statut: statut_abo.actif } }),
      this.prisma.abonnements.count({ where: { statut: statut_abo.en_retard } }),
      this.prisma.paiements_abonnements.aggregate({
        where: {
          date_paie: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { montant: true },
        _count: { id: true },
      }),
    ]);

    const mrr = monthlyRevenue._sum.prix_mensuel ?? 0;
    const totalAbonnements = abonnementsActifs + abonnementsEnRetard;
    const tauxRecouvrement = totalAbonnements > 0
      ? (abonnementsActifs / totalAbonnements) * 100
      : 0;

    return {
      mrr: {
        value: mrr,
        currency: 'TND',
        description: 'Monthly Recurring Revenue',
      },
      taux_recouvrement: {
        value: parseFloat(tauxRecouvrement.toFixed(2)),
        unit: '%',
        abonnements_actifs: abonnementsActifs,
        abonnements_en_retard: abonnementsEnRetard,
      },
      paiements_mois: {
        montant_total: paiementsThisMonth._sum.montant ?? 0,
        nombre_paiements: paiementsThisMonth._count.id,
        periode: `${startOfMonth.toISOString().split('T')[0]} - ${endOfMonth.toISOString().split('T')[0]}`,
      },
      utilisateurs: {
        total_admins: totalAdmins,
        total_employes: totalEmployes,
        total_livreurs: totalLivreurs,
        actifs: {
          admins: activeAdmins,
        },
      },
      livraisons: {
        en_attente: pendingBons,
        livrees: deliveredBons,
      },
    };
  }

  async findAllAbonnements() {
    return this.prisma.abonnements.findMany({
      include: {
        comptes: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
          },
        },
        paiements_abonnements: {
          orderBy: { date_paie: 'desc' },
          take: 5,
          select: {
            id: true,
            montant: true,
            date_paie: true,
            methode: true,
          },
        },
      },
      orderBy: { cree_le: 'desc' },
    });
  }

  async updateAbonnement(abonnementId: string, dto: import('./dto/update-abonnement.dto').UpdateAbonnementDto) {
    const abonnement = await this.prisma.abonnements.findUnique({
      where: { id: abonnementId },
    });

    if (!abonnement) {
      throw new NotFoundException('Abonnement non trouvé');
    }

    const updated = await this.prisma.abonnements.update({
      where: { id: abonnementId },
      data: {
        ...(dto.plan && { plan: dto.plan }),
        ...(dto.prix_mensuel && { prix_mensuel: dto.prix_mensuel }),
        ...(dto.statut && { statut: dto.statut }),
        ...(dto.date_echeance && { date_echeance: new Date(dto.date_echeance) }),
        ...(dto.renouvellement_auto !== undefined && { renouvellement_auto: dto.renouvellement_auto }),
        ...(dto.note !== undefined && { note: dto.note }),
        modifie_le: new Date(),
      },
      include: {
        comptes: {
          select: {
            id: true,
            nom: true,
            email: true,
          },
        },
      },
    });

    return {
      message: 'Abonnement mis à jour avec succès',
      abonnement: updated,
    };
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
          select: {
            nom: true,
            email: true,
          },
        },
        livreurs_free: {
          select: {
            disponible: true,
            note: true,
          },
        },
        bons_livraison_bons_livraison_livreur_idTocomptes: {
          where: {
            statut: { not: 'livre' },
          },
          select: {
            id: true,
            statut: true,
            client_nom: true,
            client_region: true,
          },
        },
      },
      orderBy: { cree_le: 'desc' },
    });

    return {
      total: livreurs.length,
      disponibles: livreurs.filter((l) => l.livreurs_free?.[0]?.disponible).length,
      en_livraison: livreurs.filter(
        (l) =>
          l.bons_livraison_bons_livraison_livreur_idTocomptes.length > 0,
      ).length,
      livreurs: livreurs.map((l) => ({
        id: l.id,
        nom: `${l.prenom || ''} ${l.nom}`.trim(),
        email: l.email,
        telephone: l.telephone,
        statut: l.statut,
        disponible: l.livreurs_free?.[0]?.disponible ?? true,
        admin_parent: l.comptes
          ? { id: l.admin_parent_id, nom: l.comptes.nom, email: l.comptes.email }
          : null,
        livraison_en_cours: l.bons_livraison_bons_livraison_livreur_idTocomptes,
        cree_le: l.cree_le,
      })),
    };
  }
}
