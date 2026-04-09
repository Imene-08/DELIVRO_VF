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
import { AssignerLivreurDto } from './dto/assigner-livreur.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@ApiTags('Admin - Livraisons')
@Controller('admin')
export class LivraisonController {
  constructor(private livraisonService: LivraisonService) {}

  @Get('livraisons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste tous les bons de livraison' })
  @ApiQuery({ name: 'statut', enum: statut_bon, required: false })
  @ApiQuery({ name: 'livreurId', required: false })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('statut') statut?: statut_bon,
    @Query('livreurId') livreurId?: string,
  ) {
    return this.livraisonService.findAll(req.user.userId, { statut, livreurId });
  }

  @Post('livraisons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un bon de livraison pour une commande' })
  async create(@Body() dto: CreateLivraisonDto, @Request() req: AuthenticatedRequest) {
    return this.livraisonService.create(req.user.userId, req.user.userId, dto);
  }

  @Patch('livraisons/:id/assigner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assigner un livreur à un bon de livraison' })
  async assignerLivreur(
    @Param('id') id: string,
    @Body() dto: AssignerLivreurDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.livraisonService.assignerLivreur(req.user.userId, id, dto.livreur_id);
  }

  @Get('livraisons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail d\'un bon de livraison' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.livraisonService.findOne(req.user.userId, id);
  }
}
