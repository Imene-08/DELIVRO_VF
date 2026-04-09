import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClient, role_compte } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  role: role_compte;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private prisma: PrismaClient;

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
    });
    this.prisma = new PrismaClient();
  }

  async validate(payload: JwtPayload) {
    const userId: string = payload.sub;
    const user = await this.prisma.comptes.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
