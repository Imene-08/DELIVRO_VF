import { Test, TestingModule } from '@nestjs/testing';
import { EmployeService } from './employe.service';

describe('EmployeService', () => {
  let service: EmployeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmployeService],
    }).compile();

    service = module.get<EmployeService>(EmployeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
