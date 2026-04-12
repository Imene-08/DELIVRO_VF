import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type_transaction, categorie_transaction } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ enum: type_transaction, example: type_transaction.revenu })
  @IsEnum(type_transaction)
  type: type_transaction;

  @ApiProperty({ enum: categorie_transaction, example: categorie_transaction.vente })
  @IsEnum(categorie_transaction)
  categorie: categorie_transaction;

  @ApiProperty({ example: 150.5 })
  @IsNumber()
  @Min(0)
  montant: number;

  @ApiPropertyOptional({ example: 'Vente produits' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'commande-uuid' })
  @IsOptional()
  @IsUUID()
  commande_id?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  date_operation?: string;
}
