import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsJSON,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProduitDto {
  @ApiProperty({ example: 'PROD-001', required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Description du produit', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'cat-uuid', required: false })
  @IsOptional()
  @IsUUID()
  categorie_id?: string;

  @ApiProperty({ example: { couleur: 'noir', taille: '128GB' }, required: false })
  @IsOptional()
  attributs?: Record<string, any>;

  @ApiProperty({ example: 800.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prix_achat?: number;

  @ApiProperty({ example: 999.99 })
  @IsNumber()
  @Min(0)
  prix_vente: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  quantite_stock: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seuil_bas?: number;

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seuil_moyen?: number;

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seuil_plein?: number;
}
