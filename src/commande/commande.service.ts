import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statut_commande, role_compte, statut_facture } from '@prisma/client';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';
import { UpdateStatutDto } from './dto/update-statut.dto';

@Injectable()
export class CommandeService {
  constructor(private prisma: PrismaService) {}

  private readonly transitionsAutorisees: Record<statut_commande, statut_commande[]> = {
    brouillon: ['confirmee', 'annulee'],
    confirmee: ['en_livraison', 'annulee'],
    en_livraison: ['livree', 'retour'],
    livree: [],
    retour: [],
    annulee: [],
  };

  async create(adminId: string, userId: string, dto: CreateCommandeDto) {
    const total = dto.lignes.reduce(
      (sum, ligne) => sum + ligne.quantite * ligne.prix_unitaire,
      0,
    );

    const commande = await this.prisma.$transaction(async (tx) => {
      const cmd = await tx.commandes.create({
        data: {
          client_id: dto.client_id,
          client_nom: dto.client_nom,
          client_tel: dto.client_tel,
          client_adresse: dto.client_adresse,
          client_region: dto.client_region,
          note: dto.note,
          total_dt: total,
          cree_par: userId,
          admin_id: adminId,
          statut: statut_commande.brouillon,
        },
        include: {
          clients: {
            select: { id: true, nom: true, telephone: true },
          },
        },
      });

      for (const ligne of dto.lignes) {
        await tx.lignes_commande.create({
          data: {
            commande_id: cmd.id,
            produit_id: ligne.produit_id,
            produit_nom: ligne.produit_nom,
            quantite: ligne.quantite,
            prix_unitaire: ligne.prix_unitaire,
          },
        });
      }

      return cmd;
    });

    return {
      message: 'Commande créée avec succès',
      commande,
    };
  }

  async findAll(adminId: string, options?: { statut?: statut_commande; clientId?: string; search?: string }) {
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

    const commandes = await this.prisma.commandes.findMany({
      where,
      include: {
        clients: {
          select: { id: true, nom: true, telephone: true },
        },
        lignes_commande: {
          select: {
            id: true,
            produit_nom: true,
            quantite: true,
            prix_unitaire: true,
            sous_total: true,
          },
        },
        _count: {
          select: { bons_livraison: true },
        },
      },
      orderBy: { cree_le: 'desc' },
    });

    return commandes;
  }

  async findOne(adminId: string, commandeId: string) {
    const commande = await this.prisma.commandes.findFirst({
      where: { id: commandeId, admin_id: adminId },
      include: {
        clients: {
          select: { id: true, nom: true, telephone: true, adresse: true, region: true },
        },
        lignes_commande: {
          include: {
            produits: {
              select: { id: true, reference: true },
            },
          },
        },
        bons_livraison: {
          orderBy: { cree_le: 'desc' },
          include: {
            comptes_bons_livraison_livreur_idTocomptes: {
              select: { id: true, nom: true, telephone: true },
            },
          },
        },
        factures: {
          select: { id: true, numero_facture: true, statut: true, montant_total: true },
        },
      },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    return commande;
  }

  async update(adminId: string, commandeId: string, dto: UpdateCommandeDto) {
    const commande = await this.prisma.commandes.findFirst({
      where: { id: commandeId, admin_id: adminId },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.statut !== statut_commande.brouillon) {
      throw new ForbiddenException('Seules les commandes en brouillon peuvent être modifiées');
    }

    const updated = await this.prisma.commandes.update({
      where: { id: commandeId },
      data: {
        ...dto,
        modifie_le: new Date(),
      },
      include: {
        clients: {
          select: { id: true, nom: true, telephone: true },
        },
        lignes_commande: true,
      },
    });

    return {
      message: 'Commande mise à jour avec succès',
      commande: updated,
    };
  }

  async updateStatut(adminId: string, commandeId: string, dto: UpdateStatutDto) {
    const commande = await this.prisma.commandes.findFirst({
      where: { id: commandeId, admin_id: adminId },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (!commande.statut) {
      throw new BadRequestException('Statut de commande invalide');
    }

    const statutsAutorises = this.transitionsAutorisees[commande.statut];

    if (!statutsAutorises.includes(dto.statut)) {
      throw new BadRequestException(
        `Transition non autorisée : ${commande.statut} → ${dto.statut}. Transitions possibles : ${statutsAutorises.join(', ') || 'aucune'}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const cmd = await tx.commandes.update({
        where: { id: commandeId },
        data: {
          statut: dto.statut,
          modifie_le: new Date(),
        },
        include: {
          clients: {
            select: { id: true, nom: true, telephone: true, adresse: true },
          },
          lignes_commande: true,
        },
      });

      if (dto.statut === statut_commande.confirmee) {
        for (const ligne of cmd.lignes_commande) {
          await tx.produits.update({
            where: { id: ligne.produit_id },
            data: { quantite_stock: { decrement: ligne.quantite } },
          });
        }

        const total = cmd.lignes_commande.reduce(
          (sum, ligne) => sum + Number(ligne.sous_total || ligne.quantite * Number(ligne.prix_unitaire)),
          0,
        );

        await tx.factures.create({
          data: {
            commande_id: commandeId,
            admin_id: adminId,
            client_id: cmd.client_id,
            client_nom: cmd.client_nom || cmd.clients?.nom,
            client_adresse: cmd.client_adresse || cmd.clients?.adresse,
            client_tel: cmd.client_tel || cmd.clients?.telephone,
            montant_ht: total,
            montant_total: total,
            statut: statut_facture.envoyee,
            date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      if (
        dto.statut === statut_commande.annulee &&
        commande.statut !== statut_commande.brouillon
      ) {
        for (const ligne of cmd.lignes_commande) {
          await tx.produits.update({
            where: { id: ligne.produit_id },
            data: { quantite_stock: { increment: ligne.quantite } },
          });
        }
      }

      if (dto.statut === statut_commande.retour) {
        for (const ligne of cmd.lignes_commande) {
          await tx.produits.update({
            where: { id: ligne.produit_id },
            data: { quantite_stock: { increment: ligne.quantite } },
          });
        }
      }

      return cmd;
    });

    return {
      message: `Statut mis à jour : ${commande.statut} → ${dto.statut}${dto.statut === statut_commande.confirmee ? ' (Facture générée)' : ''}`,
      commande: updated,
    };
  }

  async remove(adminId: string, commandeId: string) {
    const commande = await this.prisma.commandes.findFirst({
      where: { id: commandeId, admin_id: adminId },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (commande.statut !== statut_commande.brouillon) {
      throw new ForbiddenException('Seules les commandes en brouillon peuvent être supprimées');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lignes_commande.deleteMany({
        where: { commande_id: commandeId },
      });

      await tx.commandes.delete({
        where: { id: commandeId },
      });
    });

    return {
      message: 'Commande supprimée avec succès',
    };
  }

  async getStatutsDisponibles(adminId: string, commandeId: string) {
    const commande = await this.prisma.commandes.findFirst({
      where: { id: commandeId, admin_id: adminId },
      select: { id: true, statut: true },
    });

    if (!commande) {
      throw new NotFoundException('Commande non trouvée');
    }

    if (!commande.statut) {
      throw new BadRequestException('Statut de commande invalide');
    }

    return {
      statut_actuel: commande.statut,
      transitions_autorisees: this.transitionsAutorisees[commande.statut],
      workflow: {
        brouillon: { label: 'Brouillon', description: 'Commande en cours de saisie' },
        confirmee: { label: 'Confirmée', description: 'Commande validée' },
        en_livraison: { label: 'En livraison', description: 'Commande en cours de livraison' },
        livree: { label: 'Livrée', description: 'Commande livrée avec succès' },
        retour: { label: 'Retour', description: 'Retour client' },
        annulee: { label: 'Annulée', description: 'Commande annulée' },
      },
    };
  }
}
