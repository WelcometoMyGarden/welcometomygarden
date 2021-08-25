import { PrismaModule } from '../../config/prisma/prisma.module';
import { Test, TestingModule } from '@nestjs/testing';
import { CampsiteService } from './campsite.service';
import { CampsiteController } from './campsite.controller';

describe('CampsiteController', () => {
  let controller: CampsiteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [CampsiteController],
      providers: [CampsiteService],
    }).compile();

    controller = module.get<CampsiteController>(CampsiteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
