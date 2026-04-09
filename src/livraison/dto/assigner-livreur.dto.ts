import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignerLivreurDto {
  @ApiProperty({ example: 'livreur-uuid' })
  @IsUUID()
  livreur_id: string;
}
