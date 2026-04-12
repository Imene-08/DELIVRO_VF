import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenBlacklistService } from '../token-blacklist.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private blacklist: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req)!;

    if (this.blacklist.has(token)) {
      throw new UnauthorizedException('Token révoqué');
    }

    const user = await this.prisma.comptes.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé');
    if (user.statut !== 'actif') throw new UnauthorizedException('Compte inactif ou suspendu');

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
