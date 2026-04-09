import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CommandeService } from './commande.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte, statut_commande } from '@prisma/client';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';
import { UpdateStatutDto } from './dto/update-statut.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@ApiTags('Admin - Commandes')
@Controller('admin')
export class CommandeController {
  constructor(private commandeService: CommandeService) {}

  @Post('commandes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une commande (brouillon)' })
  async create(@Body() dto: CreateCommandeDto, @Request() req: AuthenticatedRequest) {
    return this.commandeService.create(req.user.userId, req.user.userId, dto);
  }

  @Get('commandes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des commandes filtrées' })
  @ApiQuery({ name: 'statut', enum: statut_commande, required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('statut') statut?: statut_commande,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    return this.commandeService.findAll(req.user.userId, { statut, clientId, search });
  }

  @Get('commandes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail d\'une commande avec lignes, bons, factures' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.commandeService.findOne(req.user.userId, id);
  }

  @Patch('commandes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une commande (brouillon uniquement)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommandeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commandeService.update(req.user.userId, id, dto);
  }

  @Patch('commandes/:id/statut')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changer le statut d\'une commande' })
  async updateStatut(
    @Param('id') id: string,
    @Body() dto: UpdateStatutDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commandeService.updateStatut(req.user.userId, id, dto);
  }

  @Get('commandes/:id/statuts-disponibles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Voir les statuts disponibles pour cette commande' })
  async getStatutsDisponibles(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.commandeService.getStatutsDisponibles(req.user.userId, id);
  }

  @Delete('commandes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une commande (brouillon uniquement)' })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.commandeService.remove(req.user.userId, id);
  }
}
