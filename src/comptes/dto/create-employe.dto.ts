import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  nom: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiProperty({ example: 'employe@example.com' })
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
}
