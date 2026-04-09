import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty({ example: 10, description: 'Quantité à ajouter (positif) ou retirer (négatif)' })
  @IsNumber()
  quantite: number;
}
