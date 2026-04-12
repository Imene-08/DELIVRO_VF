import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  statut_bon,
  statut_commande,
  type_transaction,
  categorie_transaction,
} from '@prisma/client';
import { CreateLivraisonDto } from './dto/create-livraison.dto';
import { ResultatLivraisonDto, ResultatLivraison } from './dto/resultat-livraison.dto';

@Injectable()
export class LivraisonService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, role: string, options?: { statut?: statut_bon; livreurId?: string }) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const where: any = { admin_id: adminId };

    if (options?.statut) where.statut = options.statut;
    if (options?.livreurId) {
      where.livraisons_livreurs = { some: { livreur_id: options.livreurId } };
    }

    return this.prisma.bons_livraison.findMany({
      where,
      include: {
        commandes: {
          include: {
            clients: { select: { id: true, nom: true, telephone: true, adresse: true, ville: true } },
          },
        },
        livraisons_livreurs: {
          include: { comptes: { select: { id: true, nom: true, prenom: true, telephone: true } } },
        },
      },
      orderBy: { cree_le: 'desc' },
    });
  }

  async create(userId: string, role: string, dto: CreateLivraisonDto) {
    const adminId = await this.prisma.resolveAdminId(userId, role);

    const commande = await this.prisma.commandes.findFirst({
      where: { id: dto.commande_id, admin_id: adminId },
      include: {
        clients: { select: { nom: true, telephone: true, adresse: true, ville: true } },
        lignes_commande: true,
      },
    });

    if (!commande) throw new NotFoundException('Commande non trouvée');

    if (commande.statut !== statut_commande.confirmee && commande.statut !== statut_commande.en_livraison) {
      throw new ForbiddenException('La commande doit être confirmée pour créer un bon de livraison');
    }

    const bon = await this.prisma.$transaction(async (tx) => {
      const b = await tx.bons_livraison.create({
        data: {
          commande_id: dto.commande_id,
          admin_id: adminId,
          statut: statut_bon.en_attente,
          client_nom: commande.clients?.nom,
          client_telephone: commande.clients?.telephone,
          client_adresse: commande.clients?.adresse,
          client_ville: commande.clients?.ville,
          date_livraison_prevue: dto.date_prevue ? new Date(dto.date_prevue) : undefined,
          note_livraison: dto.note,
        },
        include: {
          commandes: {
            include: { clients: { select: { nom: true, telephone: true } } },
          },
        },
      });

      // Retrait du stock à la création du bon (règle métier #2)
      for (const ligne of commande.lignes_commande) {
        await tx.produits.update({
          where: { id: ligne.produit_id },
          data: { quantite_stock: { decrement: ligne.quantite } },
        });
      }

      if (commande.statut === statut_commande.confirmee) {
        await tx.commandes.update({
          where: { id: dto.commande_id },
          data: { statut: statut_commande.en_livraison },
        });
      }

      return b;
    });

    return { message: 'Bon de livraison créé avec succès', bon_livraison: bon };
  }

  async findOne(userId: string, role: string, bonId: string) {
    let bon: any;

    if (role === 'livreur') {
      bon = await this.prisma.bons_livraison.findFirst({
        where: {
          id: bonId,
          livraisons_livreurs: { some: { livreur_id: userId } },
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
        },
      });
    } else {
      const adminId = await this.prisma.resolveAdminId(userId, role);
      bon = await this.prisma.bons_livraison.findFirst({
        where: { id: bonId, admin_id: adminId },
        include: {
          commandes: {
            include: {
              clients: { select: { id: true, nom: true, telephone: true, adresse: true, ville: true } },
              lignes_commande: {
                include: { produits: { select: { nom: true, reference: true } } },
              },
            },
          },
          livraisons_livreurs: {
            include: { comptes: { select: { id: true, nom: true, prenom: true, telephone: true } } },
          },
        },
      });
    }

    if (!bon) throw new NotFoundException('Bon de livraison non trouvé');
    return bon;
  }

  // ─── Actions livreur ─────────────────────────────────────────────────────────

  async accepter(livreurId: string, bonId: string) {
    const assignment = await this.prisma.livraisons_livreurs.findFirst({
      where: { bon_id: bonId, livreur_id: livreurId },
      include: { bons_livraison: true },
    });

    if (!assignment || assignment.bons_livraison.statut !== statut_bon.en_attente) {
      throw new NotFoundException('Bon de livraison non trouvé ou non assigné');
    }

    const updated = await this.prisma.bons_livraison.update({
      where: { id: bonId },
      data: { statut: statut_bon.en_cours },
      include: {
        commandes: {
          include: { clients: { select: { nom: true, telephone: true, adresse: true } } },
        },
      },
    });

    return { message: 'Livraison acceptée', bon_livraison: updated };
  }

  async refuser(livreurId: string, bonId: string) {
    const assignment = await this.prisma.livraisons_livreurs.findFirst({
      where: { bon_id: bonId, livreur_id: livreurId },
      include: {
        bons_livraison: {
          include: {
            commandes: { include: { lignes_commande: true } },
          },
        },
      },
    });

    if (!assignment || assignment.bons_livraison.statut !== statut_bon.en_attente) {
      throw new NotFoundException('Bon de livraison non trouvé ou statut invalide');
    }

    const bon = assignment.bons_livraison;

    await this.prisma.$transaction(async (tx) => {
      // Supprime l'assignment
      await tx.livraisons_livreurs.delete({ where: { id: assignment.id } });

      // Réintègre le stock (règle métier #3)
      if (bon.commandes?.lignes_commande) {
        for (const ligne of bon.commandes.lignes_commande) {
          await tx.produits.update({
            where: { id: ligne.produit_id },
            data: { quantite_stock: { increment: ligne.quantite } },
          });
        }
      }

      // Commande repasse à confirmee (règle métier #3)
      await tx.commandes.update({
        where: { id: bon.commande_id },
        data: { statut: statut_commande.confirmee },
      });

      // Bon repasse en attente (prêt pour réassignation)
      await tx.bons_livraison.update({
        where: { id: bonId },
        data: { statut: statut_bon.en_attente },
      });
    });

    return { message: 'Livraison refusée, stock réintégré', bon_id: bonId };
  }

  async resultat(livreurId: string, bonId: string, dto: ResultatLivraisonDto) {
    if (dto.resultat === ResultatLivraison.retour && !dto.motif) {
      throw new BadRequestException('Le motif est obligatoire en cas de retour');
    }

    const assignment = await this.prisma.livraisons_livreurs.findFirst({
      where: { bon_id: bonId, livreur_id: livreurId },
      include: {
        bons_livraison: {
          include: {
            commandes: {
              include: { lignes_commande: true },
            },
          },
        },
      },
    });

    if (!assignment || assignment.bons_livraison.statut !== statut_bon.en_cours) {
      throw new NotFoundException('Bon de livraison non trouvé (statut doit être "en_cours")');
    }

    const bon = assignment.bons_livraison;

    await this.prisma.$transaction(async (tx) => {
      if (dto.resultat === ResultatLivraison.livre) {
        // Bon → livré
        await tx.bons_livraison.update({
          where: { id: bonId },
          data: { statut: statut_bon.livre, date_livraison_reelle: new Date() },
        });

        // Commande → livrée
        await tx.commandes.update({
          where: { id: bon.commande_id },
          data: { statut: statut_commande.livree },
        });

        // Crée la transaction de revenu (règle métier : Si livre → transaction revenu)
        const montant = bon.commandes?.total_ttc ?? 0;
        await tx.transactions.create({
          data: {
            type: type_transaction.revenu,
            categorie: categorie_transaction.vente,
            montant: montant,
            description: `Vente livrée — bon #${bon.numero_bon}`,
            commande_id: bon.commande_id,
            cree_par: livreurId,
            admin_id: bon.admin_id,
          },
        });
      } else {
        // Bon → retour
        await tx.bons_livraison.update({
          where: { id: bonId },
          data: {
            statut: statut_bon.retour,
            motif_retour: dto.motif,
            date_livraison_reelle: new Date(),
          },
        });

        // Commande → retour (règle métier #4)
        await tx.commandes.update({
          where: { id: bon.commande_id },
          data: { statut: statut_commande.retour },
        });

        // Réintègre le stock (règle métier #4)
        if (bon.commandes?.lignes_commande) {
          for (const ligne of bon.commandes.lignes_commande) {
            await tx.produits.update({
              where: { id: ligne.produit_id },
              data: { quantite_stock: { increment: ligne.quantite } },
            });
          }
        }
      }
    });

    return {
      message: dto.resultat === ResultatLivraison.livre ? 'Livraison confirmée' : 'Retour enregistré',
      bon_id: bonId,
      resultat: dto.resultat,
    };
  }
}
