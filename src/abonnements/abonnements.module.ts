import { Module } from '@nestjs/common';
import { AbonnementsController } from './abonnements.controller';
import { AbonnementsService } from './abonnements.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AbonnementsController],
  providers: [AbonnementsService],
})
export class AbonnementsModule {}
