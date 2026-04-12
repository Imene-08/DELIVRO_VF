import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFactureDto {
  @ApiProperty({ example: 'commande-uuid', description: 'ID de la commande livrée' })
  @IsUUID()
  commande_id: string;
}
