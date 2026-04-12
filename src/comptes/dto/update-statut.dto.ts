import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { statut_compte } from '@prisma/client';

export class UpdateStatutCompteDto {
  @ApiProperty({ enum: statut_compte, example: statut_compte.actif })
  @IsEnum(statut_compte)
  statut: statut_compte;
}
