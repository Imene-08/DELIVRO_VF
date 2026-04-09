import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { type_transaction, cat_transaction } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ enum: type_transaction, example: type_transaction.revenu })
  @IsEnum(type_transaction)
  type: type_transaction;

  @ApiProperty({ enum: cat_transaction, example: cat_transaction.vente })
  @IsEnum(cat_transaction)
  categorie: cat_transaction;

  @ApiProperty({ example: 150.5 })
  @IsNumber()
  @Min(0)
  montant: number;

  @ApiProperty({ example: 'Vente de produits', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'commande-uuid', required: false })
  @IsOptional()
  @IsUUID()
  commande_id?: string;

  @ApiProperty({ example: 'facture-uuid', required: false })
  @IsOptional()
  @IsUUID()
  facture_id?: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsOptional()
  @IsDateString()
  date_operation?: string;
}
