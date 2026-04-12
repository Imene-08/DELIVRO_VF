import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AbonnementsService } from './abonnements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SUPER_ADMIN } from '../auth/roles.constants';
import { plan_abonnement } from '@prisma/client';

class UpdatePlanDto {
  @ApiProperty({ enum: plan_abonnement, example: plan_abonnement.pro })
  @IsEnum(plan_abonnement)
  plan: plan_abonnement;
}

@ApiTags('Abonnements')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SUPER_ADMIN)
@Controller('abonnements')
export class AbonnementsController {
  constructor(private abonnementsService: AbonnementsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les abonnements' })
  findAll() {
    return this.abonnementsService.findAll();
  }

  @Post(':id/payer')
  @ApiOperation({ summary: 'Marquer payé + renouveler échéance +30j' })
  payer(@Param('id') id: string) {
    return this.abonnementsService.payer(id);
  }

  @Patch(':id/plan')
  @ApiOperation({ summary: 'Changer plan + recalculer prix (49/99/199 DT)' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.abonnementsService.updatePlan(id, dto.plan);
  }
}
