import { Test, TestingModule } from '@nestjs/testing';
import { LivreurController } from './livreur.controller';

describe('LivreurController', () => {
  let controller: LivreurController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivreurController],
    }).compile();

    controller = module.get<LivreurController>(LivreurController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
