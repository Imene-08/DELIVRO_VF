import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte } from '@prisma/client';

interface AuthenticatedRequest {
  user: { userId: string; email: string; role: role_compte };
}

@ApiTags('Statistiques')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(role_compte.admin)
@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'CA global par période' })
  @ApiQuery({ name: 'debut', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'fin', required: false, example: '2024-12-31' })
  async getStats(
    @Request() req: AuthenticatedRequest,
    @Query('debut') debut?: string,
    @Query('fin') fin?: string,
  ) {
    return this.statsService.getStatsGlobales(req.user.userId, { debut, fin });
  }

  @Get('regions')
  @ApiOperation({ summary: 'CA par région' })
  async getStatsByRegion(@Request() req: AuthenticatedRequest) {
    return this.statsService.getStatsByRegion(req.user.userId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'CA par catégorie' })
  async getStatsByCategorie(@Request() req: AuthenticatedRequest) {
    return this.statsService.getStatsByCategorie(req.user.userId);
  }

  @Get('produits')
  @ApiOperation({ summary: 'Top produits (filtre produit × région)' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({ name: 'region', required: false })
  async getTopProduits(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('region') region?: string,
  ) {
    return this.statsService.getTopProduits(req.user.userId, { limit: limit ? parseInt(limit) : 10, region });
  }
}
