import { IsString, IsOptional, IsNumber, IsUUID, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProduitDto {
  @ApiProperty({ example: 'PROD-001' })
  @IsString()
  reference: string;

  @ApiProperty({ example: 'Huile d\'olive 1L' })
  @IsString()
  nom: string;

  @ApiPropertyOptional({ example: 'Huile d\'olive extra vierge' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'cat-uuid' })
  @IsOptional()
  @IsUUID()
  categorie_id?: string;

  @ApiPropertyOptional({ example: 8.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prix_achat?: number;

  @ApiProperty({ example: 12.99 })
  @IsNumber()
  @Min(0)
  prix_vente: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantite_stock: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seuil_bas?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seuil_moyen?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seuil_plein?: number;

  @ApiPropertyOptional({
    example: { couleur: 'rouge', taille: 'M', poids: '500g', matiere: 'coton' },
    description: 'Attributs libres JSONB (couleur, taille, poids, matière, etc.)',
  })
  @IsOptional()
  @IsObject()
  attributs?: Record<string, unknown>;
}
