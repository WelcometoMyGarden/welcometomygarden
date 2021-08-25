import { Injectable } from '@nestjs/common';
import { Campsite } from '@prisma/client';
import { PrismaService } from '../../config/prisma/prisma.service';
import { CampsiteDTO } from './dto/campsite.dto';

@Injectable()
export class CampsiteService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Campsite[]> {
    return this.prisma.campsite.findMany();
  }

  async getOne(id: number): Promise<Campsite> {
    return this.prisma.campsite.findUnique({
      where: {
        id,
      },
    });
  }

  async createOne(data: CampsiteDTO): Promise<Campsite> {
    return await this.prisma.campsite.create({ data });
  }

  async updateOne(data: CampsiteDTO): Promise<Campsite> {
    const { id } = data;
    return await this.prisma.campsite.update({
      where: {
        id,
      },
      data,
    });
  }

  async deleteOne(id: number): Promise<Campsite> {
    return await this.prisma.campsite.delete({
      where: {
        id,
      },
    });
  }
}
