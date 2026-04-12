import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, niveau_stock } from '@prisma/client';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CreateCategorieDto } from './dto/create-categorie.dto';

@Injectable()
export class ProduitService {
  constructor(private prisma: PrismaService) {}

  private resolveAdminId(userId: string, role: string) {
    return this.prisma.resolveAdminId(userId, role);
  }

  async create(userId: string, role: string, dto: CreateProduitDto) {
    const adminId = await this.resolveAdminId(userId, role);

    const produit = await this.prisma.produits.create({
      data: {
        reference: dto.reference,
        nom: dto.nom,
        description: dto.description,
        categorie_id: dto.categorie_id,
        prix_achat: dto.prix_achat,
        prix_vente: dto.prix_vente,
        quantite_stock: dto.quantite_stock,
        seuil_bas: dto.seuil_bas ?? 5,
        seuil_moyen: dto.seuil_moyen ?? 20,
        seuil_plein: dto.seuil_plein ?? 50,
        // Attributs JSONB libres (couleur, taille, poids, matière…)
        ...(dto.attributs !== undefined && {
          attributs: dto.attributs as Prisma.InputJsonValue,
        }),
        admin_id: adminId,
      },
      include: { categories: { select: { id: true, nom: true } } },
    });

    await this.checkAndCreateAlerte(produit);
    return { message: 'Produit créé avec succès', produit };
  }

  async findAll(userId: string, role: string, options?: { categorieId?: string; niveau?: niveau_stock; search?: string }) {
    const adminId = await this.resolveAdminId(userId, role);
    const where: any = { admin_id: adminId };

    if (options?.categorieId) where.categorie_id = options.categorieId;
    if (options?.niveau) where.niveau_actuel = options.niveau;
    if (options?.search) {
      where.OR = [
        { nom: { contains: options.search, mode: 'insensitive' } },
        { reference: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.produits.findMany({
      where,
      include: { categories: { select: { id: true, nom: true } } },
      orderBy: { cree_le: 'desc' },
    });
  }

  async update(userId: string, role: string, produitId: string, dto: UpdateProduitDto) {
    const adminId = await this.resolveAdminId(userId, role);
    const produit = await this.prisma.produits.findFirst({ where: { id: produitId, admin_id: adminId } });

    if (!produit) throw new NotFoundException('Produit non trouvé');

    // Construit l'objet update de façon explicite pour éviter le conflit de types Prisma
    const data: Prisma.produitsUncheckedUpdateInput = { modifie_le: new Date() };

    if (dto.nom !== undefined) data.nom = dto.nom;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.categorie_id !== undefined) data.categorie_id = dto.categorie_id;
    if (dto.prix_achat !== undefined) data.prix_achat = dto.prix_achat;
    if (dto.prix_vente !== undefined) data.prix_vente = dto.prix_vente;
    if (dto.quantite_stock !== undefined) data.quantite_stock = dto.quantite_stock;
    if (dto.seuil_bas !== undefined) data.seuil_bas = dto.seuil_bas;
    if (dto.seuil_moyen !== undefined) data.seuil_moyen = dto.seuil_moyen;
    if (dto.seuil_plein !== undefined) data.seuil_plein = dto.seuil_plein;
    if (dto.attributs !== undefined) data.attributs = dto.attributs as Prisma.InputJsonValue;

    const updated = await this.prisma.produits.update({
      where: { id: produitId },
      data,
      include: { categories: { select: { id: true, nom: true } } },
    });

    if (dto.quantite_stock !== undefined) {
      await this.checkAndCreateAlerte(updated);
    }

    return { message: 'Produit mis à jour avec succès', produit: updated };
  }

  async remove(userId: string, role: string, produitId: string) {
    const adminId = await this.resolveAdminId(userId, role);
    const produit = await this.prisma.produits.findFirst({ where: { id: produitId, admin_id: adminId } });

    if (!produit) throw new NotFoundException('Produit non trouvé');

    await this.prisma.produits.delete({ where: { id: produitId } });
    return { message: 'Produit supprimé avec succès' };
  }

  async updateStock(userId: string, role: string, produitId: string, dto: UpdateStockDto) {
    const adminId = await this.resolveAdminId(userId, role);
    const produit = await this.prisma.produits.findFirst({ where: { id: produitId, admin_id: adminId } });

    if (!produit) throw new NotFoundException('Produit non trouvé');

    const nouvelleQuantite = produit.quantite_stock + dto.quantite;
    if (nouvelleQuantite < 0) throw new ForbiddenException('Stock insuffisant');

    const updated = await this.prisma.produits.update({
      where: { id: produitId },
      data: { quantite_stock: nouvelleQuantite, modifie_le: new Date() },
      include: { categories: { select: { id: true, nom: true } } },
    });

    await this.checkAndCreateAlerte(updated);

    return {
      message: `Stock : ${produit.quantite_stock} → ${nouvelleQuantite}`,
      produit: updated,
    };
  }

  async getAlertesStock(userId: string, role: string, options?: { lu?: boolean; niveau?: niveau_stock }) {
    const adminId = await this.resolveAdminId(userId, role);

    const where: any = { produits: { admin_id: adminId } };
    if (options?.lu !== undefined) where.lu = options.lu;
    if (options?.niveau) where.niveau = options.niveau;

    const alertes = await this.prisma.alertes_stock.findMany({
      where,
      include: {
        produits: { select: { id: true, nom: true, reference: true, quantite_stock: true } },
      },
      orderBy: { cree_le: 'desc' },
    });

    return {
      total_alertes: alertes.length,
      alertes_non_lues: alertes.filter((a) => !a.lu).length,
      alertes,
    };
  }

  async findAllCategories(userId: string, role: string) {
    const adminId = await this.resolveAdminId(userId, role);
    const categories = await this.prisma.categories.findMany({
      where: { admin_id: adminId },
      include: { _count: { select: { produits: true } } },
      orderBy: { nom: 'asc' },
    });
    return { total: categories.length, categories };
  }

  async createCategorie(userId: string, role: string, dto: CreateCategorieDto) {
    const adminId = await this.resolveAdminId(userId, role);
    const categorie = await this.prisma.categories.create({
      data: { nom: dto.nom, description: dto.description, admin_id: adminId },
    });
    return { message: 'Catégorie créée avec succès', categorie };
  }

  private async checkAndCreateAlerte(produit: any) {
    let niveau: niveau_stock | null = null;
    let message = '';

    if (produit.quantite_stock === 0) {
      niveau = 'vide';
      message = `Stock VIDE pour "${produit.nom}"`;
    } else if (produit.quantite_stock <= produit.seuil_bas) {
      niveau = 'bas';
      message = `Stock BAS pour "${produit.nom}" (${produit.quantite_stock} restants)`;
    }

    if (niveau) {
      const existing = await this.prisma.alertes_stock.findFirst({
        where: { produit_id: produit.id, niveau, lu: false },
      });
      if (!existing) {
        await this.prisma.alertes_stock.create({
          data: { produit_id: produit.id, niveau, quantite: produit.quantite_stock, message },
        });
      }
    }
  }
}
