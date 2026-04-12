import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { SUPER_ADMIN } from '../auth/roles.constants';
import { role_compte } from '@prisma/client';
import { CreateEmployeDto } from './dto/create-employe.dto';
import { CreateCompteDto } from './dto/create-compte.dto';
import { UpdateStatutCompteDto } from './dto/update-statut.dto';

interface AuthenticatedRequest {
  user: { userId: string; email: string; role: string };
}

@ApiTags('Comptes & Utilisateurs')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('comptes')
export class ComptesController {
  constructor(private comptesService: ComptesService) {}

  // ─── Super Admin ─────────────────────────────────────────────────────────────

  @Post()
  @Roles(SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un compte admin, employé ou livreur' })
  async createCompte(@Body() dto: CreateCompteDto, @Request() req: AuthenticatedRequest) {
    return this.comptesService.createCompte(req.user.userId, dto);
  }

  @Get()
  @Roles(SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister tous les comptes' })
  async findAll() {
    return this.comptesService.findAllComptes();
  }

  @Patch(':id/statut')
  @Roles(SUPER_ADMIN)
  @ApiOperation({ summary: 'Activer/suspendre un compte (cascade sous-comptes si admin)' })
  async updateStatut(@Param('id') id: string, @Body() dto: UpdateStatutCompteDto) {
    return this.comptesService.updateStatutCompte(id, dto);
  }

  @Delete(':id')
  @Roles(SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer un compte' })
  async deleteCompte(@Param('id') id: string) {
    return this.comptesService.deleteCompte(id);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Post('employes')
  @Roles(role_compte.admin)
  @ApiOperation({ summary: 'Créer un employé (rattaché à soi)' })
  async createEmploye(@Body() dto: CreateEmployeDto, @Request() req: AuthenticatedRequest) {
    return this.comptesService.createEmploye(req.user.userId, dto);
  }

  @Get('employes')
  @Roles(role_compte.admin)
  @ApiOperation({ summary: 'Lister ses propres employés' })
  async getMesEmployes(@Request() req: AuthenticatedRequest) {
    return this.comptesService.findMesEmployes(req.user.userId);
  }

  @Patch('employes/:id/statut')
  @Roles(role_compte.admin)
  @ApiOperation({ summary: 'Activer/suspendre un de ses employés' })
  async updateStatutEmploye(
    @Param('id') id: string,
    @Body() dto: UpdateStatutCompteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.comptesService.updateStatutEmploye(req.user.userId, id, dto);
  }
}
