import { Module } from '@nestjs/common';
import { LivreurController } from './livreur.controller';
import { LivreurService } from './livreur.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LivreurController],
  providers: [LivreurService],
})
export class LivreurModule {}
