import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { categorie_transaction } from '@prisma/client';

export class CreateDepenseDto {
  @ApiProperty({ example: 150.5 })
  @IsNumber()
  @Min(0)
  montant: number;

  @ApiProperty({ example: 'Carburant livreur' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: categorie_transaction, example: categorie_transaction.transport })
  @IsOptional()
  @IsEnum(categorie_transaction)
  categorie?: categorie_transaction;

  @ApiPropertyOptional({ example: '2024-12-01' })
  @IsOptional()
  @IsDateString()
  date_operation?: string;
}
