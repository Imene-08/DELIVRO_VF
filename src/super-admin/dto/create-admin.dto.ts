import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { plan_abonnement } from '@prisma/client';

export class CreateAdminDto {
  // ── Compte ──────────────────────────────────────────────────────────────

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  nom: string;

  @ApiPropertyOptional({ example: 'Jean' })
  @IsString()
  @IsOptional()
  prenom?: string;

  @ApiProperty({ example: 'jean.dupont@entreprise.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+21612345678' })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiProperty({ example: 'Password1!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message:
      'mot_de_passe must contain at least one uppercase letter, one number, and one special character',
  })
  mot_de_passe: string;

  // ── Abonnement ───────────────────────────────────────────────────────────

  @ApiProperty({ enum: plan_abonnement, example: plan_abonnement.starter })
  @IsEnum(plan_abonnement)
  plan: plan_abonnement;

  @ApiPropertyOptional({
    example: '2026-05-18',
    description: "Date d'échéance ISO 8601. Par défaut : date_debut + 30 jours.",
  })
  @IsOptional()
  @IsISO8601()
  date_echeance?: string;
}
