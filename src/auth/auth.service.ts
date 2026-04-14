import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { CreateSuperAdminDto } from '../super-admin/dto/create-super-admin.dto';
import { role_compte, statut_compte } from '@prisma/client';

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<
    string,
    { count: number; lockedUntil?: number }
  >();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private blacklist: TokenBlacklistService,
  ) {}

  async login(loginDto: LoginDto) {
    try {
      // ✅ 1. Vérification des champs
      if (!loginDto.email || !loginDto.mot_de_passe) {
        throw new UnauthorizedException('Email et mot de passe requis');
      }

      const emailKey = loginDto.email.toLowerCase();
      const now = Date.now();
      const attempts = this.loginAttempts.get(emailKey);

      // ✅ 2. Anti brute-force
      if (attempts?.lockedUntil && now < attempts.lockedUntil) {
        const remainingMin = Math.ceil((attempts.lockedUntil - now) / 60000);
        throw new UnauthorizedException(
          `Trop de tentatives. Réessayez dans ${remainingMin} minute(s)`,
        );
      }

      // ✅ 3. Chercher user
      const user = await this.prisma.comptes.findUnique({
        where: { email: loginDto.email },
      });

      // ❌ Si user inexistant
      if (!user) {
        this.registerFailedAttempt(emailKey);
        throw new UnauthorizedException('Email ou mot de passe invalide');
      }

      // ❌ Si mot de passe manquant en DB
      if (!user.mot_de_passe) {
        throw new UnauthorizedException('Mot de passe invalide');
      }

      // ✅ 4. Vérification bcrypt (SAFE)
      const isPasswordValid = await bcrypt.compare(
        loginDto.mot_de_passe,
        user.mot_de_passe,
      );

      if (!isPasswordValid) {
        this.registerFailedAttempt(emailKey);
        throw new UnauthorizedException('Email ou mot de passe invalide');
      }

      // ✅ 5. Vérification statut
      if (user.role !== 'super_admin' && user.statut !== 'actif') {
        throw new UnauthorizedException('Compte inactif ou suspendu');
      }

      // ✅ 6. Reset tentative
      this.loginAttempts.delete(emailKey);

      // ✅ 7. JWT
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
          telephone: user.telephone,
          statut: user.statut,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('LOGIN ERROR =>', error);
      throw new InternalServerErrorException('Erreur interne du serveur');
    }
  }

  private registerFailedAttempt(emailKey: string) {
    const current = this.loginAttempts.get(emailKey) ?? { count: 0 };
    const newCount = current.count + 1;

    if (newCount >= LOGIN_MAX_ATTEMPTS) {
      this.loginAttempts.set(emailKey, {
        count: newCount,
        lockedUntil: Date.now() + LOGIN_LOCK_DURATION_MS,
      });
    } else {
      this.loginAttempts.set(emailKey, { count: newCount });
    }
  }

  logout(token: string): void {
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;

    const expiresAt = decoded?.exp
      ? decoded.exp * 1000
      : Date.now() + 24 * 60 * 60 * 1000;

    this.blacklist.add(token, expiresAt);
  }

  async registerSuperAdmin(dto: CreateSuperAdminDto) {
    const existingSuperAdmin = await this.prisma.comptes.findFirst({
      where: { role: role_compte.super_admin },
    });

    if (existingSuperAdmin) {
      throw new ForbiddenException(
        "Un super admin existe déjà. Utilisez l'interface protégée pour en créer un autre.",
      );
    }

    const existingEmail = await this.prisma.comptes.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(dto.mot_de_passe, 10);

    const superAdmin = await this.prisma.comptes.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email,
        telephone: dto.telephone,
        mot_de_passe: hashedPassword,
        role: role_compte.super_admin,
        statut: statut_compte.actif,
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

    const payload = {
      sub: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: superAdmin,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.comptes.findUnique({
      where: { id: userId },
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
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    return user;
  }
}