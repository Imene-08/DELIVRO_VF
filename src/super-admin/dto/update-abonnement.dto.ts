import { IsOptional, IsEnum, IsNumber, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { plan_abo, statut_abo } from '@prisma/client';

export class UpdateAbonnementDto {
  @ApiPropertyOptional({ enum: plan_abo, example: plan_abo.pro })
  @IsOptional()
  @IsEnum(plan_abo)
  plan?: plan_abo;

  @ApiPropertyOptional({ example: 49.99 })
  @IsOptional()
  @IsNumber()
  prix_mensuel?: number;

  @ApiPropertyOptional({ enum: statut_abo, example: statut_abo.actif })
  @IsOptional()
  @IsEnum(statut_abo)
  statut?: statut_abo;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  date_echeance?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  renouvellement_auto?: boolean;

  @ApiPropertyOptional({ example: 'Note modifiée' })
  @IsOptional()
  @IsString()
  note?: string;
}
