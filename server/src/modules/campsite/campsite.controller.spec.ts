import { Test, TestingModule } from '@nestjs/testing';
import { CampsiteController } from './campsite.controller';

describe('CampsiteController', () => {
  let controller: CampsiteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampsiteController],
    }).compile();

    controller = module.get<CampsiteController>(CampsiteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
