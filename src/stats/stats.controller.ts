import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte } from '@prisma/client';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@ApiTags('Admin - Stats')
@Controller('admin')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques par région et par catégorie' })
  async getStats(@Request() req: AuthenticatedRequest) {
    const [parRegion, parCategorie, globales] = await Promise.all([
      this.statsService.getStatsByRegion(req.user.userId),
      this.statsService.getStatsByCategorie(req.user.userId),
      this.statsService.getStatsGlobales(req.user.userId),
    ]);

    return {
      par_region: parRegion,
      par_categorie: parCategorie,
      globales: globales,
    };
  }
}
