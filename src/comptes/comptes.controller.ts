import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ComptesService } from './comptes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte } from '@prisma/client';
import { CreateEmployeDto } from './dto/create-employe.dto';
import { CreateLivreurDto } from './dto/create-livreur.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@ApiTags('Admin - Gestion des comptes')
@Controller('admin')
export class ComptesController {
  constructor(private comptesService: ComptesService) {}

  @Post('employes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un employé' })
  async createEmploye(
    @Body() dto: CreateEmployeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.comptesService.createEmploye(req.user.userId, dto);
  }

  @Post('livreurs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un livreur free' })
  async createLivreur(
    @Body() dto: CreateLivreurDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.comptesService.createLivreur(req.user.userId, dto);
  }

  @Get('comptes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Voir ses employés et livreurs' })
  async getMesComptes(@Request() req: AuthenticatedRequest) {
    return this.comptesService.findMesComptes(req.user.userId);
  }

  @Patch('comptes/:id/suspendre')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspendre un employé ou livreur' })
  async suspendreCompte(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.comptesService.suspendreCompte(req.user.userId, id);
  }
}
