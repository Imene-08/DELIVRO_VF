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

@Injectable()
export class AuthService {
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
    const user = await this.validateUser(loginDto.email, loginDto.mot_de_passe);

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe invalide');
    }

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
    this.blacklist.add(token);
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
