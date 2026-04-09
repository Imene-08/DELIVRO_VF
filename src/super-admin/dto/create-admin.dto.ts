import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { plan_abo, statut_abo } from '@prisma/client';

export class CreateAdminDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+21612345678' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  mot_de_passe: string;

  @ApiProperty({ enum: plan_abo, example: plan_abo.starter })
  @IsEnum(plan_abo)
  plan: plan_abo;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  prix_mensuel: number;

  @ApiProperty({ enum: statut_abo, example: statut_abo.actif, required: false })
  @IsOptional()
  @IsEnum(statut_abo)
  statut_abonnement?: statut_abo;

  @ApiProperty({ example: '2024-01-01', required: false })
  @IsOptional()
  @IsDateString()
  date_debut?: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsDateString()
  date_echeance: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  renouvellement_auto?: boolean;

  @ApiProperty({ example: 'Note sur l\'admin', required: false })
  @IsOptional()
  @IsString()
  note_abonnement?: string;
}
