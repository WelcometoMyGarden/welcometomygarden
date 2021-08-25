import { Injectable } from '@nestjs/common';
import { Campsite, Prisma } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';

@Injectable()
export class CampsiteService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Campsite[]> {
    return this.prisma.campsite.findMany();
  }

  async getOne(where: Prisma.CampsiteWhereUniqueInput): Promise<Campsite> {
    return this.prisma.campsite.findUnique({
      where,
    });
  }

  async createOne(data: Prisma.CampsiteCreateInput): Promise<Campsite> {
    return await this.prisma.campsite.create({ data });
  }

  async updateOne(params: {
    where: Prisma.CampsiteWhereUniqueInput;
    data: Prisma.CampsiteUpdateInput;
  }): Promise<Campsite> {
    const { where, data } = params;
    return await this.prisma.campsite.update({
      where,
      data,
    });
  }

  async deleteOne(where: Prisma.CampsiteWhereUniqueInput): Promise<Campsite> {
    return await this.prisma.campsite.delete({
      where,
    });
  }
}
