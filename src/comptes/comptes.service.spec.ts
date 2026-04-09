import { Test, TestingModule } from '@nestjs/testing';
import { ComptesService } from './comptes.service';

describe('ComptesService', () => {
  let service: ComptesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComptesService],
    }).compile();

    service = module.get<ComptesService>(ComptesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
