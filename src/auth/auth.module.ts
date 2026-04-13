import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { TokenBlacklistService } from './token-blacklist.service';
import { PrismaModule } from '../prisma/prisma.module'; // ← AJOUTEZ CETTE LIGNE

@Module({
  imports: [
    PrismaModule, // ← AJOUTEZ CETTE LIGNE
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard, TokenBlacklistService],
  exports: [AuthService],
})
export class AuthModule {}