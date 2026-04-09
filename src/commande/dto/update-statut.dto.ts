import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { statut_commande } from '@prisma/client';

export class UpdateStatutDto {
  @ApiProperty({ enum: statut_commande, example: statut_commande.confirmee })
  @IsEnum(statut_commande)
  statut: statut_commande;

  @ApiProperty({ example: 'Motif du changement', required: false })
  @IsOptional()
  @IsString()
  motif?: string;
}
