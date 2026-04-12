import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { statut_facture, statut_commande, type_transaction, categorie_transaction } from '@prisma/client';
import { CreateFactureDto } from './dto/create-facture.dto';
import { UpdateStatutFactureDto } from './dto/update-statut-facture.dto';

@Injectable()
export class FactureService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, role: string, options?: { statut?: statut_facture; clientId?: string; search?: string }) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const where: any = { admin_id: adminId };

    if (options?.statut) where.statut = options.statut;
    if (options?.clientId) where.client_id = options.clientId;
    if (options?.search) {
      where.clients = { nom: { contains: options.search, mode: 'insensitive' } };
    }

    return this.prisma.factures.findMany({
      where,
      include: {
        clients: { select: { id: true, nom: true, telephone: true } },
        commandes: { select: { id: true, numero: true, statut: true } },
      },
      orderBy: { cree_le: 'desc' },
    });
  }

  async create(userId: string, role: string, dto: CreateFactureDto) {
    const adminId = await this.prisma.resolveAdminId(userId, role);

    const commande = await this.prisma.commandes.findFirst({
      where: { id: dto.commande_id, admin_id: adminId },
      include: { lignes_commande: true, clients: true },
    });

    if (!commande) throw new NotFoundException('Commande non trouvée');
    if (commande.statut !== statut_commande.livree) {
      throw new ForbiddenException('La facture ne peut être créée que pour une commande livrée');
    }

    const factureExistante = await this.prisma.factures.findFirst({
      where: { commande_id: dto.commande_id },
    });
    if (factureExistante) throw new ConflictException('Une facture existe déjà pour cette commande');

    const total = commande.lignes_commande.reduce(
      (sum, l) => sum + Number(l.sous_total || l.quantite * Number(l.prix_unitaire)),
      0,
    );

    const facture = await this.prisma.factures.create({
      data: {
        commande_id: dto.commande_id,
        admin_id: adminId,
        client_id: commande.client_id,
        montant_ht: total,
        montant_ttc: total,
        statut: statut_facture.envoyee,
        date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: {
        commandes: { select: { id: true, numero: true } },
        clients: { select: { id: true, nom: true } },
      },
    });

    return { message: 'Facture créée avec succès', facture };
  }

  async findOne(userId: string, role: string, factureId: string) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const facture = await this.prisma.factures.findFirst({
      where: { id: factureId, admin_id: adminId },
      include: {
        clients: { select: { id: true, nom: true, telephone: true, adresse: true, ville: true } },
        commandes: {
          include: {
            lignes_commande: {
              include: { produits: { select: { nom: true, reference: true } } },
            },
          },
        },
      },
    });

    if (!facture) throw new NotFoundException('Facture non trouvée');
    return facture;
  }

  async updateStatut(userId: string, role: string, factureId: string, dto: UpdateStatutFactureDto) {
    const adminId = await this.prisma.resolveAdminId(userId, role);
    const facture = await this.prisma.factures.findFirst({ where: { id: factureId, admin_id: adminId } });

    if (!facture) throw new NotFoundException('Facture non trouvée');
    if (facture.statut === dto.statut) throw new ConflictException(`La facture est déjà ${dto.statut}`);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.factures.update({
        where: { id: factureId },
        data: { statut: dto.statut },
      });

      if (dto.statut === statut_facture.payee) {
        await tx.transactions.create({
          data: {
            type: type_transaction.revenu,
            categorie: categorie_transaction.vente,
            montant: facture.montant_ttc,
            description: `Paiement facture #${facture.numero_facture}`,
            commande_id: facture.commande_id,
            date_operation: new Date(),
            cree_par: userId,
            admin_id: adminId,
          },
        });
      }

      return updated;
    });

    return { message: `Facture marquée "${dto.statut}"`, facture: result };
  }
}
