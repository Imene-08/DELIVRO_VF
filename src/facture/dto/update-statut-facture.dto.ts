import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { statut_facture } from '@prisma/client';

export class UpdateStatutFactureDto {
  @ApiProperty({ enum: statut_facture, example: statut_facture.payee })
  @IsEnum(statut_facture)
  statut: statut_facture;
}
