import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LivreurService } from './livreur.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte } from '@prisma/client';

interface AuthenticatedRequest {
  user: { userId: string; email: string; role: role_compte };
}

@ApiTags('Livreur — Mes Livraisons')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(role_compte.livreur)
@Controller('livreur')
export class LivreurController {
  constructor(private livreurService: LivreurService) {}

  @Get('livraisons')
  @ApiOperation({ summary: 'Mes livraisons assignées' })
  async getMesLivraisons(@Request() req: AuthenticatedRequest) {
    return this.livreurService.getMesLivraisons(req.user.userId);
  }
}
