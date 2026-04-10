import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comptes } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TokenBlacklistService } from './token-blacklist.service';

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private blacklist: TokenBlacklistService,
  ) {}

  async validateUser(
    email: string,
    mot_de_passe: string,
  ): Promise<Omit<comptes, 'mot_de_passe'> | null> {
    const user = await this.prisma.comptes.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(mot_de_passe, user.mot_de_passe))) {
      const { mot_de_passe: _pwd, ...result } = user;
      return result;
    }

    return null;
  }

  async login(loginDto: LoginDto) {
    const emailKey = loginDto.email.toLowerCase();
    const now = Date.now();
    const attempts = this.loginAttempts.get(emailKey);

    if (attempts?.lockedUntil && now < attempts.lockedUntil) {
      const remainingMin = Math.ceil((attempts.lockedUntil - now) / 60000);
      throw new UnauthorizedException(
        `Trop de tentatives échouées. Réessayez dans ${remainingMin} minute(s)`,
      );
    }

    const user = await this.validateUser(loginDto.email, loginDto.mot_de_passe);

    if (!user) {
      const current = this.loginAttempts.get(emailKey) ?? { count: 0 };
      const newCount = current.count + 1;

      if (newCount >= LOGIN_MAX_ATTEMPTS) {
        this.loginAttempts.set(emailKey, {
          count: newCount,
          lockedUntil: now + LOGIN_LOCK_DURATION_MS,
        });
        throw new UnauthorizedException(
          'Trop de tentatives échouées. Compte bloqué pendant 15 minutes',
        );
      }

      this.loginAttempts.set(emailKey, { count: newCount });
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }

    this.loginAttempts.delete(emailKey);

    if (user.statut !== 'actif') {
      throw new UnauthorizedException('Compte inactif ou suspendu');
    }

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
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.comptes.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const hashedPassword = await bcrypt.hash(registerDto.mot_de_passe, 10);

    const user = await this.prisma.comptes.create({
      data: {
        nom: registerDto.nom,
        prenom: registerDto.prenom,
        email: registerDto.email,
        telephone: registerDto.telephone,
        mot_de_passe: hashedPassword,
        role: registerDto.role,
        admin_parent_id: registerDto.admin_parent_id,
        statut: 'actif',
      },
    });

    const { mot_de_passe: _pwd, ...result } = user;

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: result,
    };
  }

  logout(token: string): void {
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? decoded.exp * 1000
      : Date.now() + 24 * 60 * 60 * 1000;
    this.blacklist.add(token, expiresAt);
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
