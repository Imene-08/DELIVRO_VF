import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statut_commande } from '@prisma/client';
import { CreateCommandeDto } from './dto/create-commande.dto';

@Injectable()
export class CommandeService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, role: string, dto: CreateCommandeDto) {
    const adminId = await this.prisma.resolveAdminId(userId, role);

    const client = await this.prisma.clients.findFirst({
      where: { id: dto.client_id, admin_id: adminId },
    });
    if (!client) throw new NotFoundException('Client non trouvé');

    // Calcul total depuis les prix en base (règle métier #1 : prix = prix_vente DB × quantité)
    const produits = await this.prisma.produits.findMany({
      where: { id: { in: dto.lignes.map((l) => l.produit_id) }, admin_id: adminId },
      select: { id: true, prix_vente: true },
    });

    const prixMap = new Map(produits.map((p) => [p.id, Number(p.prix_vente)]));

    const lignesAvecPrix = dto.lignes.map((l) => {
      const prixUnitaire = prixMap.get(l.produit_id);
      if (!prixUnitaire) throw new NotFoundException(`Produit ${l.produit_id} non trouvé`);
      return { ...l, prix_unitaire: prixUnitaire };
    });

    const total_ht = lignesAvecPrix.reduce((sum, l) => sum + l.quantite * l.prix_unitaire, 0);

    // NOTE : le stock est retiré UNIQUEMENT à la création du bon de livraison (règle #2)
    const commande = await this.prisma.$transaction(async (tx) => {
      const cmd = await tx.commandes.create({
        data: {
          client_id: dto.client_id,
          note: dto.note,
          total_ht,
          total_ttc: total_ht,
          cree_par: userId,
          admin_id: adminId,
          statut: statut_commande.confirmee,
        },
        include: {
          clients: { select: { id: true, nom: true, telephone: true, adresse: true, ville: true } },
        },
      });

      for (const ligne of lignesAvecPrix) {
        await tx.lignes_commande.create({
          data: {
            commande_id: cmd.id,
            produit_id: ligne.produit_id,
            quantite: ligne.quantite,
            prix_unitaire: ligne.prix_unitaire,
          },
        });
      }

      return cmd;
    });

    return { message: 'Commande créée avec succès', commande };
  }

  async findAll(
    userId: string,
    role: string,
    options?: { statut?: statut_commande; clientId?: string; search?: string },
  ) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const where: any = { admin_id: adminId };

    if (options?.statut) where.statut = options.statut;
    if (options?.clientId) where.client_id = options.clientId;
    if (options?.search) {
      where.clients = { nom: { contains: options.search, mode: 'insensitive' } };
    }

    return this.prisma.commandes.findMany({
      where,
      include: {
        clients: { select: { id: true, nom: true, telephone: true, ville: true } },
        lignes_commande: {
          select: { id: true, produit_id: true, quantite: true, prix_unitaire: true, sous_total: true },
        },
        _count: { select: { bons_livraison: true } },
      },
      orderBy: { cree_le: 'desc' },
    });
  }

  async findOne(userId: string, role: string, commandeId: string) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const commande = await this.prisma.commandes.findFirst({
      where: { id: commandeId, admin_id: adminId },
      include: {
        clients: { select: { id: true, nom: true, telephone: true, adresse: true, ville: true } },
        lignes_commande: {
          include: { produits: { select: { id: true, nom: true, reference: true, prix_vente: true } } },
        },
        bons_livraison: {
          orderBy: { cree_le: 'desc' },
          include: {
            livraisons_livreurs: {
              include: { comptes: { select: { id: true, nom: true, telephone: true } } },
            },
          },
        },
        factures: { select: { id: true, numero_facture: true, statut: true, montant_ttc: true } },
      },
    });

    if (!commande) throw new NotFoundException('Commande non trouvée');
    return commande;
  }

  async annuler(userId: string, role: string, commandeId: string) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const commande = await this.prisma.commandes.findFirst({
      where: { id: commandeId, admin_id: adminId },
    });

    if (!commande) throw new NotFoundException('Commande non trouvée');

    // Seule une commande confirmée peut être annulée (spec : "annule si statut confirmee")
    if (commande.statut !== statut_commande.confirmee) {
      throw new ForbiddenException(
        `Impossible d'annuler une commande "${commande.statut}". Seule une commande confirmée peut être annulée.`,
      );
    }

    await this.prisma.commandes.update({
      where: { id: commandeId },
      data: { statut: statut_commande.annulee, modifie_le: new Date() },
    });

    // Pas de réintégration de stock ici : le stock n'est retiré qu'au bon de livraison
    return { message: 'Commande annulée avec succès', commande_id: commandeId };
  }
}
