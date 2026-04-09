import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LivreurService } from './livreur.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class RefuserLivraisonDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motif?: string;
}

class RetourLivraisonDto {
  @ApiProperty({ required: true, example: 'Client absent' })
  @IsString()
  motif: string;
}

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@ApiTags('Livreur - Mes Livraisons')
@Controller('livreur')
export class LivreurController {
  constructor(private livreurService: LivreurService) {}

  @Get('livraisons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.livreur)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes livraisons assignées (infos client, adresse, commande)' })
  async getMesLivraisons(@Request() req: AuthenticatedRequest) {
    return this.livreurService.getMesLivraisons(req.user.userId);
  }

  @Patch('livraisons/:id/accepter')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.livreur)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accepter une livraison' })
  async accepterLivraison(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.livreurService.accepterLivraison(req.user.userId, id);
  }

  @Patch('livraisons/:id/refuser')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.livreur)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refuser une livraison' })
  async refuserLivraison(
    @Param('id') id: string,
    @Body() dto: RefuserLivraisonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.livreurService.refuserLivraison(req.user.userId, id, dto.motif);
  }

  @Patch('livraisons/:id/livree')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.livreur)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer comme livrée' })
  async marquerLivree(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.livreurService.marquerLivree(req.user.userId, id);
  }

  @Patch('livraisons/:id/retour')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.livreur)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marquer comme retour' })
  async marquerRetour(
    @Param('id') id: string,
    @Body() dto: RetourLivraisonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.livreurService.marquerRetour(req.user.userId, id, dto.motif);
  }
}
