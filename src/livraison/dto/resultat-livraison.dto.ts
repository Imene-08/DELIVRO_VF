import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ResultatLivraison {
  livre = 'livre',
  retour = 'retour',
}

export class ResultatLivraisonDto {
  @ApiProperty({ enum: ResultatLivraison, example: ResultatLivraison.livre })
  @IsEnum(ResultatLivraison)
  resultat: ResultatLivraison;

  @ApiPropertyOptional({ example: 'Client absent', description: 'Motif obligatoire en cas de retour' })
  @IsOptional()
  @IsString()
  motif?: string;
}
