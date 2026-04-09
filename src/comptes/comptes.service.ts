import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { role_compte, statut_compte } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateEmployeDto } from './dto/create-employe.dto';
import { CreateLivreurDto } from './dto/create-livreur.dto';

@Injectable()
export class ComptesService {
  constructor(private prisma: PrismaService) {}

  async createEmploye(adminId: string, dto: CreateEmployeDto) {
    const existingUser = await this.prisma.comptes.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(dto.mot_de_passe, 10);

    const employe = await this.prisma.comptes.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        telephone: dto.telephone,
        mot_de_passe: hashedPassword,
        role: role_compte.employe,
        statut: statut_compte.actif,
        admin_parent_id: adminId,
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

    return {
      message: 'Employé créé avec succès',
      employe,
    };
  }

  async createLivreur(adminId: string, dto: CreateLivreurDto) {
    const existingUser = await this.prisma.comptes.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(dto.mot_de_passe, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const livreur = await tx.comptes.create({
        data: {
          nom: dto.nom,
          prenom: dto.prenom,
          email: dto.email,
          telephone: dto.telephone,
          mot_de_passe: hashedPassword,
          role: role_compte.livreur,
          statut: statut_compte.actif,
          admin_parent_id: adminId,
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

      await tx.livreurs_free.create({
        data: {
          compte_id: livreur.id,
          disponible: dto.disponible ?? true,
          note: dto.note,
        },
      });

      return livreur;
    });

    return {
      message: 'Livreur créé avec succès',
      livreur: result,
    };
  }

  async findMesComptes(adminId: string) {
    const [employes, livreurs] = await Promise.all([
      this.prisma.comptes.findMany({
        where: {
          admin_parent_id: adminId,
          role: role_compte.employe,
        },
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          statut: true,
          cree_le: true,
          modifie_le: true,
        },
        orderBy: { cree_le: 'desc' },
      }),
      this.prisma.comptes.findMany({
        where: {
          admin_parent_id: adminId,
          role: role_compte.livreur,
        },
        select: {
          id: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          statut: true,
          cree_le: true,
          modifie_le: true,
          livreurs_free: {
            select: {
              disponible: true,
              note: true,
            },
          },
        },
        orderBy: { cree_le: 'desc' },
      }),
    ]);

    return {
      employes,
      livreurs,
      total_employes: employes.length,
      total_livreurs: livreurs.length,
    };
  }

  async suspendreCompte(adminId: string, compteId: string) {
    const compte = await this.prisma.comptes.findFirst({
      where: {
        id: compteId,
        admin_parent_id: adminId,
        role: { in: [role_compte.employe, role_compte.livreur] },
      },
    });

    if (!compte) {
      throw new NotFoundException('Compte non trouvé ou non autorisé');
    }

    if (compte.statut === statut_compte.suspendu) {
      throw new ConflictException('Ce compte est déjà suspendu');
    }

    const updated = await this.prisma.comptes.update({
      where: { id: compteId },
      data: { statut: statut_compte.suspendu },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        statut: true,
        modifie_le: true,
      },
    });

    return {
      message: 'Compte suspendu avec succès',
      compte: updated,
    };
  }
}
