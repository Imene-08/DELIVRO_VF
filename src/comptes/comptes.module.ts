import { Module } from '@nestjs/common';
import { ComptesController } from './comptes.controller';
import { ComptesService } from './comptes.service';

@Module({
  controllers: [ComptesController],
  providers: [ComptesService],
})
export class ComptesModule {}
