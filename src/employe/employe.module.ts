import { Module } from '@nestjs/common';
import { EmployeController } from './employe.controller';
import { EmployeService } from './employe.service';

@Module({
  controllers: [EmployeController],
  providers: [EmployeService],
})
export class EmployeModule {}
