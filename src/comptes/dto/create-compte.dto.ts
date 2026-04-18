import { IsEmail, IsString, MinLength, IsOptional, IsIn, IsUUID, Matches } from 'class-validator';
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

  @ApiProperty({ example: 'employe@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+21612345678' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiProperty({ example: 'Password1!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: 'mot_de_passe must contain at least one uppercase letter, one number, and one special character',
  })
  mot_de_passe: string;

  @ApiProperty({
    enum: [role_compte.employe, role_compte.livreur],
    example: role_compte.employe,
    description: 'Seuls employe et livreur sont autorisés ici.',
  })
  @IsIn([role_compte.employe, role_compte.livreur], {
    message: 'role doit être employe ou livreur.',
  })
  role: role_compte;

  @ApiPropertyOptional({
    example: 'uuid-de-l-admin',
    description: 'Obligatoire si role=employe. Ignoré si role=livreur (le livreur est indépendant).',
  })
  @IsOptional()
  @IsUUID()
  admin_parent_id?: string;
}
