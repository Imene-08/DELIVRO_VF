import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LigneCommandeDto {
  @ApiProperty({ example: 'produit-uuid' })
  @IsUUID()
  produit_id: string;

  @ApiProperty({ example: 2, description: 'Quantité commandée' })
  @IsNumber()
  @Min(1)
  quantite: number;

  // prix_unitaire retiré : toujours pris depuis produits.prix_vente en base (règle #1)
}

export class CreateCommandeDto {
  @ApiProperty({ example: 'client-uuid', description: 'ID du client (obligatoire)' })
  @IsUUID()
  client_id: string;

  @ApiPropertyOptional({ example: 'Livrer avant 18h' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [LigneCommandeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  lignes: LigneCommandeDto[];
}
