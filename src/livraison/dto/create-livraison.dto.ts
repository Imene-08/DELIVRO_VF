import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLivraisonDto {
  @ApiProperty({ example: 'commande-uuid' })
  @IsUUID()
  commande_id: string;

  @ApiProperty({ example: 'Livraison express', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsOptional()
  @IsDateString()
  date_prevue?: string;
}
