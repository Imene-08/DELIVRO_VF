import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { role_compte, statut_compte } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateEmployeDto } from './dto/create-employe.dto';
import { UpdateEmployeDto } from './dto/update-employe.dto';
import { CreateCompteDto } from './dto/create-compte.dto';
import { UpdateStatutCompteDto } from './dto/update-statut.dto';

@Injectable()
export class ComptesService {
  constructor(private prisma: PrismaService) {}

  // ─── Super Admin ─────────────────────────────────────────────────────────────

  async createCompte(superAdminId: string, dto: CreateCompteDto) {
    if (dto.role === role_compte.admin || dto.role === role_compte.super_admin) {
      throw new BadRequestException(
        "La création d'un compte admin passe par POST /api/super/admins.",
      );
    }

    // Un employé doit être rattaché à un admin existant
    if (dto.role === role_compte.employe) {
      if (!dto.admin_parent_id) {
        throw new BadRequestException("admin_parent_id est obligatoire pour un employé.");
      }
      const admin = await this.prisma.comptes.findFirst({
        where: { id: dto.admin_parent_id, role: role_compte.admin },
      });
      if (!admin) throw new NotFoundException('Admin introuvable ou ID invalide');
    }

    const existing = await this.prisma.comptes.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const hashedPassword = await bcrypt.hash(dto.mot_de_passe, 10);

    const compte = await this.prisma.comptes.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        telephone: dto.telephone,
        mot_de_passe: hashedPassword,
        role: dto.role,
        statut: statut_compte.actif,
        // Livreur : pas de rattachement admin
        ...(dto.role === role_compte.employe && { admin_parent_id: dto.admin_parent_id }),
      },
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, role: true, statut: true, admin_parent_id: true, cree_le: true },
    });

    return { message: 'Compte créé avec succès', compte };
  }

  async findAllComptes() {
    const comptes = await this.prisma.comptes.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        statut: true,
        cree_le: true,
        modifie_le: true,
      },
      orderBy: { cree_le: 'desc' },
    });
    return { total: comptes.length, comptes };
  }

  async updateStatutCompte(compteId: string, dto: UpdateStatutCompteDto) {
    const compte = await this.prisma.comptes.findUnique({ where: { id: compteId } });
    if (!compte) throw new NotFoundException('Compte non trouvé');
    if (compte.statut === dto.statut) throw new ConflictException(`Ce compte est déjà ${dto.statut}`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.comptes.update({
        where: { id: compteId },
        data: { statut: dto.statut },
        select: { id: true, nom: true, email: true, role: true, statut: true },
      });

      let cascade = { employes: 0, livreurs: 0 };
      if (compte.role === role_compte.admin) {
        const [emp, liv] = await Promise.all([
          tx.comptes.updateMany({ where: { admin_parent_id: compteId, role: role_compte.employe }, data: { statut: dto.statut } }),
          tx.comptes.updateMany({ where: { admin_parent_id: compteId, role: role_compte.livreur }, data: { statut: dto.statut } }),
        ]);
        cascade = { employes: emp.count, livreurs: liv.count };
      }

      return { message: `Compte ${dto.statut} avec succès`, compte: updated, cascade };
    });
  }

  async deleteCompte(compteId: string) {
    const compte = await this.prisma.comptes.findUnique({ where: { id: compteId } });
    if (!compte) throw new NotFoundException('Compte non trouvé');
    await this.prisma.comptes.delete({ where: { id: compteId } });
    return { message: 'Compte supprimé avec succès' };
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  async createEmploye(adminId: string, dto: CreateEmployeDto) {
    const existing = await this.prisma.comptes.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

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
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, role: true, statut: true, cree_le: true },
    });

    return { message: 'Employé créé avec succès', employe };
  }

  async findMesEmployes(adminId: string) {
    const employes = await this.prisma.comptes.findMany({
      where: { admin_parent_id: adminId, role: role_compte.employe },
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, statut: true, cree_le: true, modifie_le: true },
      orderBy: { cree_le: 'desc' },
    });
    return { total: employes.length, employes };
  }

  async updateStatutEmploye(adminId: string, employeId: string, dto: UpdateStatutCompteDto) {
    const employe = await this.prisma.comptes.findFirst({
      where: { id: employeId, admin_parent_id: adminId, role: role_compte.employe },
    });
    if (!employe) throw new NotFoundException('Employé non trouvé ou non autorisé');
    if (employe.statut === dto.statut) throw new ConflictException(`Cet employé est déjà ${dto.statut}`);

    const updated = await this.prisma.comptes.update({
      where: { id: employeId },
      data: { statut: dto.statut },
      select: { id: true, nom: true, email: true, statut: true },
    });
    return { message: `Employé ${dto.statut} avec succès`, employe: updated };
  }

  async updateEmploye(adminId: string, employeId: string, dto: UpdateEmployeDto) {
    const employe = await this.prisma.comptes.findFirst({
      where: { id: employeId, admin_parent_id: adminId, role: role_compte.employe },
    });
    if (!employe) throw new NotFoundException('Employé non trouvé ou non autorisé');

    if (dto.email && dto.email !== employe.email) {
      const existing = await this.prisma.comptes.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Cet email est déjà utilisé');
    }

    const updated = await this.prisma.comptes.update({
      where: { id: employeId },
      data: dto,
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, statut: true, modifie_le: true },
    });
    return { message: 'Employé mis à jour avec succès', employe: updated };
  }

  async deleteEmploye(adminId: string, employeId: string) {
    const employe = await this.prisma.comptes.findFirst({
      where: { id: employeId, admin_parent_id: adminId, role: role_compte.employe },
    });
    if (!employe) throw new NotFoundException('Employé non trouvé ou non autorisé');

    await this.prisma.comptes.delete({ where: { id: employeId } });
    return { message: 'Employé supprimé avec succès' };
  }
}
