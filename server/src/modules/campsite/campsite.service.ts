import { Injectable } from '@nestjs/common';
import { Campsite, Prisma } from '@prisma/client';

import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class CampsiteService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<Campsite[]> {
    return this.prisma.campsite.findMany();
  }

  async createCampsite(data: Prisma.CampsiteCreateInput): Promise<Campsite> {
    return this.prisma.campsite.create({
      data,
    });
  }
}
