import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { niveau_stock } from '@prisma/client';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class ProduitService {
  constructor(private prisma: PrismaService) {}

  async create(adminId: string, dto: CreateProduitDto) {
    const produit = await this.prisma.produits.create({
      data: {
        ...dto,
        admin_id: adminId,
        attributs: dto.attributs ?? {},
        seuil_bas: dto.seuil_bas ?? 5,
        seuil_moyen: dto.seuil_moyen ?? 20,
        seuil_plein: dto.seuil_plein ?? 50,
      },
      include: {
        categories: {
          select: { id: true, nom: true },
        },
      },
    });

    await this.checkAndCreateAlerte(adminId, produit);

    return {
      message: 'Produit créé avec succès',
      produit,
    };
  }

  async findAll(adminId: string, options?: { categorieId?: string; niveau?: niveau_stock; search?: string }) {
    const where: any = { admin_id: adminId };

    if (options?.categorieId) {
      where.categorie_id = options.categorieId;
    }

    if (options?.niveau) {
      where.niveau_stock = options.niveau;
    }

    if (options?.search) {
      where.OR = [
        { nom: { contains: options.search, mode: 'insensitive' } },
        { reference: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const produits = await this.prisma.produits.findMany({
      where,
      include: {
        categories: {
          select: { id: true, nom: true },
        },
      },
      orderBy: { cree_le: 'desc' },
    });

    return produits;
  }

  async findOne(adminId: string, produitId: string) {
    const produit = await this.prisma.produits.findFirst({
      where: { id: produitId, admin_id: adminId },
      include: {
        categories: {
          select: { id: true, nom: true },
        },
        alertes_stock: {
          where: { lu: false },
          orderBy: { cree_le: 'desc' },
        },
      },
    });

    if (!produit) {
      throw new NotFoundException('Produit non trouvé');
    }

    return produit;
  }

  async update(adminId: string, produitId: string, dto: UpdateProduitDto) {
    const produit = await this.prisma.produits.findFirst({
      where: { id: produitId, admin_id: adminId },
    });

    if (!produit) {
      throw new NotFoundException('Produit non trouvé');
    }

    const updated = await this.prisma.produits.update({
      where: { id: produitId },
      data: {
        ...dto,
        modifie_le: new Date(),
      },
      include: {
        categories: {
          select: { id: true, nom: true },
        },
      },
    });

    if (dto.quantite_stock !== undefined) {
      await this.checkAndCreateAlerte(adminId, updated);
    }

    return {
      message: 'Produit mis à jour avec succès',
      produit: updated,
    };
  }

  async remove(adminId: string, produitId: string) {
    const produit = await this.prisma.produits.findFirst({
      where: { id: produitId, admin_id: adminId },
    });

    if (!produit) {
      throw new NotFoundException('Produit non trouvé');
    }

    await this.prisma.produits.delete({
      where: { id: produitId },
    });

    return {
      message: 'Produit supprimé avec succès',
    };
  }

  async getStockWithLevels(adminId: string) {
    const produits = await this.prisma.produits.findMany({
      where: { admin_id: adminId },
      select: {
        id: true,
        nom: true,
        reference: true,
        quantite_stock: true,
        seuil_bas: true,
        seuil_moyen: true,
        seuil_plein: true,
        niveau_stock: true,
        categories: {
          select: { id: true, nom: true },
        },
      },
      orderBy: [
        { niveau_stock: 'asc' },
        { nom: 'asc' },
      ],
    });

    const niveauxVisuels = {
      vide: { label: 'Vide', couleur: '#dc2626', icone: 'alert-circle', urgent: true },
      bas: { label: 'Bas', couleur: '#ea580c', icone: 'alert-triangle', urgent: true },
      moyen: { label: 'Moyen', couleur: '#ca8a04', icone: 'package', urgent: false },
      plein: { label: 'Plein', couleur: '#16a34a', icone: 'check-circle', urgent: false },
    };

    const stockParNiveau = {
      vide: produits.filter((p) => p.niveau_stock === 'vide'),
      bas: produits.filter((p) => p.niveau_stock === 'bas'),
      moyen: produits.filter((p) => p.niveau_stock === 'moyen'),
      plein: produits.filter((p) => p.niveau_stock === 'plein'),
    };

    return {
      total_produits: produits.length,
      produits_urgents: stockParNiveau.vide.length + stockParNiveau.bas.length,
      legende_niveaux: niveauxVisuels,
      stock_par_niveau: stockParNiveau,
      produits,
    };
  }

  async updateStock(adminId: string, produitId: string, dto: UpdateStockDto) {
    const produit = await this.prisma.produits.findFirst({
      where: { id: produitId, admin_id: adminId },
    });

    if (!produit) {
      throw new NotFoundException('Produit non trouvé');
    }

    const nouvelleQuantite = produit.quantite_stock + dto.quantite;

    if (nouvelleQuantite < 0) {
      throw new ForbiddenException('Stock insuffisant pour cette opération');
    }

    const updated = await this.prisma.produits.update({
      where: { id: produitId },
      data: {
        quantite_stock: nouvelleQuantite,
        modifie_le: new Date(),
      },
      include: {
        categories: {
          select: { id: true, nom: true },
        },
      },
    });

    await this.checkAndCreateAlerte(adminId, updated);

    return {
      message: `Stock mis à jour : ${produit.quantite_stock} → ${nouvelleQuantite}`,
      produit: updated,
    };
  }

  async getAlertesStock(adminId: string, options?: { lu?: boolean; niveau?: niveau_stock }) {
    const where: any = { admin_id: adminId };

    if (options?.lu !== undefined) {
      where.lu = options.lu;
    }

    if (options?.niveau) {
      where.niveau = options.niveau;
    }

    const alertes = await this.prisma.alertes_stock.findMany({
      where,
      include: {
        produits: {
          select: {
            id: true,
            nom: true,
            reference: true,
            quantite_stock: true,
          },
        },
      },
      orderBy: { cree_le: 'desc' },
    });

    const nonLues = alertes.filter((a) => !a.lu).length;

    return {
      total_alertes: alertes.length,
      alertes_non_lues: nonLues,
      alertes,
    };
  }

  async marquerAlerteLue(adminId: string, alerteId: string) {
    const alerte = await this.prisma.alertes_stock.findFirst({
      where: { id: alerteId, admin_id: adminId },
    });

    if (!alerte) {
      throw new NotFoundException('Alerte non trouvée');
    }

    const updated = await this.prisma.alertes_stock.update({
      where: { id: alerteId },
      data: { lu: true },
    });

    return {
      message: 'Alerte marquée comme lue',
      alerte: updated,
    };
  }

  private async checkAndCreateAlerte(adminId: string, produit: any) {
    let niveau: niveau_stock | null = null;
    let message = '';

    if (produit.quantite_stock === 0) {
      niveau = 'vide';
      message = `Stock VIDE pour "${produit.nom}"`;
    } else if (produit.quantite_stock <= produit.seuil_bas) {
      niveau = 'bas';
      message = `Stock BAS pour "${produit.nom}" (${produit.quantite_stock} unités restantes)`;
    }

    if (niveau) {
      const existingAlerte = await this.prisma.alertes_stock.findFirst({
        where: {
          produit_id: produit.id,
          niveau,
          lu: false,
        },
      });

      if (!existingAlerte) {
        await this.prisma.alertes_stock.create({
          data: {
            produit_id: produit.id,
            admin_id: adminId,
            niveau,
            quantite: produit.quantite_stock,
            message,
          },
        });
      }
    }
  }
}
