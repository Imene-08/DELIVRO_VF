import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { role_compte } from '@prisma/client';

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private blacklist: TokenBlacklistService,
  ) {}

  async login(loginDto: LoginDto) {
    const emailKey = loginDto.email.toLowerCase();
    const now = Date.now();
    const attempts = this.loginAttempts.get(emailKey);

    if (attempts?.lockedUntil && now < attempts.lockedUntil) {
      const remainingMin = Math.ceil((attempts.lockedUntil - now) / 60000);
      throw new UnauthorizedException(`Trop de tentatives. Réessayez dans ${remainingMin} minute(s)`);
    }

    // Tente dans comptes (tous rôles, y compris super_admin)
    const user = await this.prisma.comptes.findUnique({ where: { email: loginDto.email } });
    if (!user || !(await bcrypt.compare(loginDto.mot_de_passe, user.mot_de_passe))) {
      const current = this.loginAttempts.get(emailKey) ?? { count: 0 };
      const newCount = current.count + 1;
      if (newCount >= LOGIN_MAX_ATTEMPTS) {
        this.loginAttempts.set(emailKey, { count: newCount, lockedUntil: now + LOGIN_LOCK_DURATION_MS });
        throw new UnauthorizedException('Trop de tentatives. Compte bloqué pendant 15 minutes');
      }
      this.loginAttempts.set(emailKey, { count: newCount });
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }

    this.loginAttempts.delete(emailKey);

    if (user.statut !== 'actif') {
      throw new UnauthorizedException('Compte inactif ou suspendu');
    }

    this.loginAttempts.delete(emailKey);

    const payload = { sub: user.id, email: user.email, role: user.role };
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
  }

  logout(token: string): void {
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;
    const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
    this.blacklist.add(token, expiresAt);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.comptes.findUnique({
      where: { id: userId },
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, role: true, statut: true, cree_le: true, modifie_le: true },
    });

    if (!user) throw new UnauthorizedException('Utilisateur non trouvé');
    return user;
  }
}
