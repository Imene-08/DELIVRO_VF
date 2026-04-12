import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { plan_abonnement, statut_abonnement } from '@prisma/client';

const PRIX_PAR_PLAN: Record<plan_abonnement, number> = {
  starter: 49,
  pro: 99,
  business: 199,
};

@Injectable()
export class AbonnementsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.abonnements.findMany({
      include: {
        comptes: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            statut: true,
          },
        },
      },
      orderBy: { date_echeance: 'asc' },
    });
  }

  async payer(id: string) {
    const abonnement = await this.prisma.abonnements.findUnique({ where: { id } });
    if (!abonnement) throw new NotFoundException('Abonnement non trouvé');

    const baseDate =
      abonnement.date_echeance > new Date() ? abonnement.date_echeance : new Date();

    const nouvelleEcheance = new Date(baseDate);
    nouvelleEcheance.setDate(nouvelleEcheance.getDate() + 30);

    return this.prisma.abonnements.update({
      where: { id },
      data: {
        statut: statut_abonnement.actif,
        date_echeance: nouvelleEcheance,
        modifie_le: new Date(),
      },
      include: {
        comptes: { select: { id: true, nom: true, prenom: true, email: true } },
      },
    });
  }

  async updatePlan(id: string, plan: plan_abonnement) {
    const abonnement = await this.prisma.abonnements.findUnique({ where: { id } });
    if (!abonnement) throw new NotFoundException('Abonnement non trouvé');

    if (!Object.values(plan_abonnement).includes(plan)) {
      throw new BadRequestException(`Plan invalide. Valeurs possibles: starter, pro, business`);
    }

    const prix = PRIX_PAR_PLAN[plan];

    return this.prisma.abonnements.update({
      where: { id },
      data: {
        plan,
        prix_mensuel: prix,
        modifie_le: new Date(),
      },
      include: {
        comptes: { select: { id: true, nom: true, prenom: true, email: true } },
      },
    });
  }
}
