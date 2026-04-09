import { Module } from '@nestjs/common';
import { ComptesController } from './comptes.controller';
import { ComptesService } from './comptes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComptesController],
  providers: [ComptesService],
})
export class ComptesModule {}
