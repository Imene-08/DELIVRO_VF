import { Module } from '@nestjs/common';
import { LivraisonController } from './livraison.controller';
import { LivraisonService } from './livraison.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LivraisonController],
  providers: [LivraisonService],
})
export class LivraisonModule {}
