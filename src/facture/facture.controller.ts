import {
  Controller,
  Get,
  Param,
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

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@ApiTags('Admin - Factures')
@Controller('admin')
export class FactureController {
  constructor(private factureService: FactureService) {}

  @Get('factures')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des factures avec filtres par statut' })
  @ApiQuery({ name: 'statut', enum: statut_facture, required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('statut') statut?: statut_facture,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    return this.factureService.findAll(req.user.userId, { statut, clientId, search });
  }

  @Get('factures/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin, role_compte.employe)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Détail d\'une facture avec commande et transactions' })
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.factureService.findOne(req.user.userId, id);
  }
}
