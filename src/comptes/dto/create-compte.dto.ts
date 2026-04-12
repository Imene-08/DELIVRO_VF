import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { role_compte } from '@prisma/client';

export class CreateCompteDto {
  @ApiProperty({ example: 'Doe' })
  @IsString()
  nom: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+21612345678' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  mot_de_passe: string;

  @ApiProperty({ enum: role_compte, example: role_compte.admin })
  @IsEnum(role_compte)
  role: role_compte;
}
