import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLivreurDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Ben' })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiProperty({ example: 'livreur@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+21698765432' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  mot_de_passe: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  disponible?: boolean;

  @ApiProperty({ example: 'Zone Tunis centre', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
