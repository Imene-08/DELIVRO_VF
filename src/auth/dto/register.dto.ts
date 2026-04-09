import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { role_compte } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+21612345678' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  mot_de_passe: string;

  @ApiProperty({ enum: role_compte, example: role_compte.employe })
  @IsEnum(role_compte)
  role: role_compte;

  @ApiProperty({ example: 'admin-uuid' })
  @IsOptional()
  @IsString()
  admin_parent_id?: string;
}
