import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FactureService } from './facture.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte, statut_facture } from '@prisma/client';
import { CreateFactureDto } from './dto/create-facture.dto';
import { UpdateStatutFactureDto } from './dto/update-statut-facture.dto';

interface AuthenticatedRequest {
  user: { userId: string; email: string; role: role_compte };
}

@ApiTags('Factures')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(role_compte.admin, role_compte.employe)
@Controller('factures')
export class FactureController {
  constructor(private factureService: FactureService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les factures' })
  @ApiQuery({ name: 'statut', enum: statut_facture, required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('statut') statut?: statut_facture,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    return this.factureService.findAll(req.user.userId, req.user.role, { statut, clientId, search });
  }

  @Post()
  @ApiOperation({ summary: 'Créer une facture depuis commande livrée' })
  async create(@Body() dto: CreateFactureDto, @Request() req: AuthenticatedRequest) {
    return this.factureService.create(req.user.userId, req.user.role, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail + aperçu PDF' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.factureService.findOne(req.user.userId, req.user.role, id);
  }

  @Patch(':id/statut')
  @ApiOperation({ summary: 'Changer statut (payée/annulée)' })
  async updateStatut(
    @Param('id') id: string,
    @Body() dto: UpdateStatutFactureDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.factureService.updateStatut(req.user.userId, req.user.role, id, dto);
  }
}
