import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategorieDto {
  @ApiProperty({ example: 'Électronique' })
  @IsString()
  nom: string;

  @ApiPropertyOptional({ example: 'Appareils électroniques et accessoires' })
  @IsOptional()
  @IsString()
  description?: string;
}
