import { Module } from '@nestjs/common';
import { LivraisonController } from './livraison.controller';
import { LivraisonService } from './livraison.service';

@Module({
  controllers: [LivraisonController],
  providers: [LivraisonService],
})
export class LivraisonModule {}
