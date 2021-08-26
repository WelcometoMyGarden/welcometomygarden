import { Test, TestingModule } from '@nestjs/testing';
import { CampsiteService } from './campsite.service';
import { CampsiteController } from './campsite.controller';
import { CampsiteModule } from './campsite.module';
import { Prisma } from '@prisma/client';

const campsites = [
  { id: 1, userId: 1, facilities: {} },
  { id: 2, userId: 2, facilities: {} }
];

describe('CampsiteController', () => {
  let controller: CampsiteController;

  const catsService = {
    getAll: () => campsites,
    getOne: (where: Prisma.CampsiteWhereUniqueInput) => campsites.find((c) => c.id === where.id),
    createOne: (campsite: Prisma.CampsiteUpdateInput) => campsite,
    updateOne: (params: {
      where: Prisma.CampsiteWhereUniqueInput;
      data: Prisma.CampsiteUpdateInput;
    }) => ({
      ...campsites.find((c) => c.id === params.where.id),
      ...params.data
    }),
    deleteOne: (where: Prisma.CampsiteWhereUniqueInput) => campsites[where.id]
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CampsiteModule]
    })
      .overrideProvider(CampsiteService)
      .useValue(catsService)
      .compile();

    controller = module.get<CampsiteController>(CampsiteController);
  });

  describe('getAll', () => {
    it('should return campsites', async () => {
      expect(await controller.getAll()).toStrictEqual(catsService.getAll());
    });
  });

  describe('getOne', () => {
    it('should return campsite with id = 1', async () => {
      expect(await controller.getOne(1)).toBe(campsites[0]);
    });
    it('should return campsite with id = 2', async () => {
      expect(await controller.getOne(2)).toBe(campsites[1]);
    });
  });
});
