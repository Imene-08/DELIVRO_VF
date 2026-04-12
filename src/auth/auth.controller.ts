import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { role_compte } from '@prisma/client';
import { Request as ExpressRequest } from 'express';
import { ExtractJwt } from 'passport-jwt';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login → retourne JWT' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @ApiOperation({ summary: 'Vérifier le token et récupérer le profil courant' })
  async getMe(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Bearer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déconnexion — invalide le token actuel' })
  logout(@Request() req: AuthenticatedRequest) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req)!;
    this.authService.logout(token);
    return { message: 'Déconnecté avec succès' };
  }
}
