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
import { ApiProperty } from '@nestjs/swagger';

class LigneCommandeDto {
  @ApiProperty({ example: 'produit-uuid' })
  @IsUUID()
  produit_id: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  produit_nom: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantite: number;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  prix_unitaire: number;
}

export class CreateCommandeDto {
  @ApiProperty({ example: 'client-uuid', required: false })
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  client_nom?: string;

  @ApiProperty({ example: '+21612345678' })
  @IsOptional()
  @IsString()
  client_tel?: string;

  @ApiProperty({ example: '123 Rue Tunis' })
  @IsOptional()
  @IsString()
  client_adresse?: string;

  @ApiProperty({ example: 'Tunis' })
  @IsOptional()
  @IsString()
  client_region?: string;

  @ApiProperty({ example: 'Livrer avant 18h' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [LigneCommandeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  lignes: LigneCommandeDto[];
}
