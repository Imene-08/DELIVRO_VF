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
import { CommandeService } from './commande.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte, statut_commande } from '@prisma/client';
import { CreateCommandeDto } from './dto/create-commande.dto';

interface AuthenticatedRequest {
  user: { userId: string; email: string; role: role_compte };
}

@ApiTags('Commandes')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(role_compte.admin, role_compte.employe)
@Controller('commandes')
export class CommandeController {
  constructor(private commandeService: CommandeService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les commandes (filtre: statut)' })
  @ApiQuery({ name: 'statut', enum: statut_commande, required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('statut') statut?: statut_commande,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    return this.commandeService.findAll(req.user.userId, req.user.role, { statut, clientId, search });
  }

  @Post()
  @ApiOperation({ summary: 'Créer une commande (prix auto depuis base)' })
  async create(@Body() dto: CreateCommandeDto, @Request() req: AuthenticatedRequest) {
    return this.commandeService.create(req.user.userId, req.user.role, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une commande + lignes' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.commandeService.findOne(req.user.userId, req.user.role, id);
  }

  @Patch(':id/annuler')
  @ApiOperation({ summary: 'Annuler une commande confirmée' })
  async annuler(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.commandeService.annuler(req.user.userId, req.user.role, id);
  }
}
