import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SUPER_ADMIN } from '../auth/roles.constants';

@ApiTags('Super Admin — Vue Globale')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SUPER_ADMIN)
@Controller('super')
export class SuperAdminController {
  constructor(private superAdminService: SuperAdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Métriques globales + livreurs actifs' })
  async getDashboard() {
    return this.superAdminService.getDashboardStats();
  }

  @Get('livreurs')
  @ApiOperation({ summary: 'Tous les livreurs en temps réel' })
  async getAllLivreurs() {
    return this.superAdminService.findAllLivreurs();
  }
}
