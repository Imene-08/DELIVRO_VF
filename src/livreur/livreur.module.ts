import { Module } from '@nestjs/common';
import { LivreurController } from './livreur.controller';
import { LivreurService } from './livreur.service';

@Module({
  controllers: [LivreurController],
  providers: [LivreurService],
})
export class LivreurModule {}
