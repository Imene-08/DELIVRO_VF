import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statut_bon, statut_commande, role_compte } from '@prisma/client';
import { CreateLivraisonDto } from './dto/create-livraison.dto';

@Injectable()
export class LivraisonService {
  constructor(private prisma: PrismaService) {}

  async findAll(adminId: string, options?: { statut?: statut_bon; livreurId?: string }) {
    const where: any = { admin_id: adminId };

    if (options?.statut) {
      where.statut = options.statut;
    }

    if (options?.livreurId) {
      where.livreur_id = options.livreurId;
    }

    const bons = await this.prisma.bons_livraison.findMany({
      where,
      include: {
        commandes: {
          select: {
            id: true,
            numero: true,
            client_nom: true,
            client_tel: true,
            client_adresse: true,
            client_region: true,
          },
        },
        comptes_bons_livraison_livreur_idTocomptes: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true,
          },
        },
      },
      orderBy: { cree_le: 'desc' },
    });

    return bons;
  }

  async create(adminId: string, userId: string, dto: CreateLivraisonDto) {
    const commande = await this.prisma.commandes.findFirst({
      where: { id: dto.commande_id, admin_id: adminId },
      include: {
        clients: true,
      },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.statut !== statut_commande.confirmee && commande.statut !== statut_commande.en_livraison) {
      throw new ForbiddenException('La commande doit être confirmée ou en livraison pour créer un bon');
    }

    const bon = await this.prisma.$transaction(async (tx) => {
      const b = await tx.bons_livraison.create({
        data: {
          commande_id: dto.commande_id,
          admin_id: adminId,
          livreur_id: undefined,
          statut: statut_bon.en_attente,
          client_nom: commande.client_nom || commande.clients?.nom || '',
          client_tel: commande.client_tel || commande.clients?.telephone,
          client_adresse: commande.client_adresse || commande.clients?.adresse,
          client_region: commande.client_region || commande.clients?.region,
          date_prevue: dto.date_prevue ? new Date(dto.date_prevue) : undefined,
          note_admin: dto.note,
        } as any,
        include: {
          commandes: {
            select: {
              id: true,
              numero: true,
              client_nom: true,
              client_tel: true,
            },
          },
        },
      });

      if (commande.statut === statut_commande.confirmee) {
        await tx.commandes.update({
          where: { id: dto.commande_id },
          data: { statut: statut_commande.en_livraison },
        });
      }

      return b;
    });

    return {
      message: 'Bon de livraison créé avec succès',
      bon_livraison: bon,
    };
  }

  async assignerLivreur(adminId: string, bonId: string, livreurId: string) {
    const bon = await this.prisma.bons_livraison.findFirst({
      where: { id: bonId, admin_id: adminId },
    });

    if (!bon) {
      throw new NotFoundException('Bon de livraison non trouvé');
    }

    if (bon.statut !== statut_bon.en_attente) {
      throw new ForbiddenException('Ce bon est déjà pris ou traité');
    }

    const livreur = await this.prisma.comptes.findFirst({
      where: {
        id: livreurId,
        admin_parent_id: adminId,
        role: role_compte.livreur,
        statut: 'actif',
      },
      include: {
        livreurs_free: true,
      },
    });

    if (!livreur) {
      throw new NotFoundException('Livreur non trouvé ou inactif');
    }

    if (!livreur.livreurs_free || livreur.livreurs_free.length === 0 || !livreur.livreurs_free[0].disponible) {
      throw new ConflictException('Ce livreur n\'est pas disponible');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const b = await tx.bons_livraison.update({
        where: { id: bonId },
        data: {
          livreur_id: livreurId,
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
            },
          },
          comptes_bons_livraison_livreur_idTocomptes: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true,
            },
          },
        },
      });

      const livreurFree = await tx.livreurs_free.findFirst({
        where: { compte_id: livreurId },
      });
      if (livreurFree) {
        await tx.livreurs_free.update({
          where: { id: livreurFree.id },
          data: { disponible: false },
        });
      }

      return b;
    });

    return {
      message: 'Livreur assigné avec succès',
      bon_livraison: updated,
    };
  }

  async findOne(adminId: string, bonId: string) {
    const bon = await this.prisma.bons_livraison.findFirst({
      where: { id: bonId, admin_id: adminId },
      include: {
        commandes: {
          include: {
            lignes_commande: {
              select: {
                id: true,
                produit_nom: true,
                quantite: true,
              },
            },
            clients: {
              select: {
                id: true,
                nom: true,
                telephone: true,
                adresse: true,
              },
            },
          },
        },
        comptes_bons_livraison_livreur_idTocomptes: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            telephone: true,
          },
        },
        transactions: {
          select: {
            id: true,
            montant: true,
            type: true,
          },
        },
      },
    });

    if (!bon) {
      throw new NotFoundException('Bon de livraison non trouvé');
    }

    return bon;
  }
}
