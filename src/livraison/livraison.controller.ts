import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LivraisonService } from './livraison.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte, statut_bon } from '@prisma/client';
import { CreateLivraisonDto } from './dto/create-livraison.dto';
import { ResultatLivraisonDto } from './dto/resultat-livraison.dto';

interface AuthenticatedRequest {
  user: { userId: string; email: string; role: role_compte };
}

@ApiTags('Bons de Livraison')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('livraisons')
export class LivraisonController {
  constructor(private livraisonService: LivraisonService) {}

  // ─── Admin / Employé ─────────────────────────────────────────────────────────

  @Get()
  @Roles(role_compte.admin, role_compte.employe)
  @ApiOperation({ summary: 'Lister les bons de livraison' })
  @ApiQuery({ name: 'statut', enum: statut_bon, required: false })
  @ApiQuery({ name: 'livreurId', required: false })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('statut') statut?: statut_bon,
    @Query('livreurId') livreurId?: string,
  ) {
    return this.livraisonService.findAll(req.user.userId, req.user.role, { statut, livreurId });
  }

  @Post()
  @Roles(role_compte.admin, role_compte.employe)
  @ApiOperation({ summary: 'Créer un bon → stock retiré immédiatement' })
  async create(@Body() dto: CreateLivraisonDto, @Request() req: AuthenticatedRequest) {
    return this.livraisonService.create(req.user.userId, req.user.role, dto);
  }

  @Get(':id')
  @Roles(role_compte.admin, role_compte.employe, role_compte.livreur)
  @ApiOperation({ summary: 'Détail d\'un bon' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.livraisonService.findOne(req.user.userId, req.user.role, id);
  }

  // ─── Livreur ─────────────────────────────────────────────────────────────────

  @Patch(':id/accepter')
  @Roles(role_compte.livreur)
  @ApiOperation({ summary: 'Livreur accepte la demande' })
  async accepter(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.livraisonService.accepter(req.user.userId, id);
  }

  @Patch(':id/refuser')
  @Roles(role_compte.livreur)
  @ApiOperation({ summary: 'Livreur refuse → stock réintégré' })
  async refuser(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.livraisonService.refuser(req.user.userId, id);
  }

  @Patch(':id/resultat')
  @Roles(role_compte.livreur)
  @ApiOperation({ summary: 'Livré ou retour (motif obligatoire si retour)' })
  async resultat(
    @Param('id') id: string,
    @Body() dto: ResultatLivraisonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.livraisonService.resultat(req.user.userId, id, dto);
  }
}
