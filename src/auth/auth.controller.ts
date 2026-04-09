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
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Connexion avec email et mot de passe' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: "Inscription d'un nouvel utilisateur" })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déconnexion — invalide le token actuel' })
  logout(@Request() req: AuthenticatedRequest) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req)!;
    this.authService.logout(token);
    return { message: 'Déconnecté avec succès' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer le profil de l'utilisateur connecté" })
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.userId);
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Route réservée aux admins' })
  adminOnly(@Request() req: AuthenticatedRequest) {
    return { message: 'Accès admin autorisé', user: req.user };
  }

  @Get('super-admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Route réservée aux super admins' })
  superAdminOnly(@Request() req: AuthenticatedRequest) {
    return { message: 'Accès super admin autorisé', user: req.user };
  }
}
