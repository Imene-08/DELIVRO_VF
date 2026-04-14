import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSuperAdminDto {
  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  nom: string;

  @ApiPropertyOptional({ example: 'Jean' })
  @IsString()
  @IsOptional()
  prenom?: string;

  @ApiProperty({ example: 'jean.dupont@delivro.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+213XXXXXXXXX' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  mot_de_passe: string;

  @ApiPropertyOptional({ example: '+213600000000' })
  @IsString()
  @IsOptional()
  telephone?: string;
}
