import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { role_compte } from '@prisma/client';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAbonnementDto } from './dto/update-abonnement.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: role_compte;
  };
}

@ApiTags('Super Admin')
@Controller('super-admin')
export class SuperAdminController {
  constructor(private superAdminService: SuperAdminService) {}

  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste tous les admins' })
  async getAllAdmins() {
    return this.superAdminService.findAllAdmins();
  }

  @Post('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un admin avec abonnement' })
  async createAdmin(
    @Body() dto: CreateAdminDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.superAdminService.createAdmin(req.user.userId, dto);
  }

  @Patch('admins/:id/suspendre')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspendre un admin et ses employés/livreurs en cascade' })
  async suspendreAdmin(@Param('id') id: string) {
    return this.superAdminService.suspendreAdminCascade(id);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dashboard Super Admin — MRR, recouvrement, stats' })
  async getDashboard() {
    return this.superAdminService.getDashboardStats();
  }

  @Get('abonnements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste tous les abonnements avec admin et paiements récents' })
  async getAllAbonnements() {
    return this.superAdminService.findAllAbonnements();
  }

  @Patch('abonnements/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un abonnement (plan, statut, prix, échéance...)' })
  async updateAbonnement(
    @Param('id') id: string,
    @Body() dto: UpdateAbonnementDto,
  ) {
    return this.superAdminService.updateAbonnement(id, dto);
  }

  @Get('livreurs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(role_compte.super_admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste tous les livreurs en temps réel (disponibilité, position, admin parent)' })
  async getAllLivreurs() {
    return this.superAdminService.findAllLivreurs();
  }
}
