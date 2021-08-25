import { Delete } from '@nestjs/common';
import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Campsite } from '@prisma/client';
import { CampsiteService } from './campsite.service';
import { CampsiteDTO } from './dto/campsite.dto';

@ApiTags('campsite')
@Controller('/campsites')
export class CampsiteController {
  constructor(private campsiteService: CampsiteService) {}

  @Get()
  async getAll(): Promise<Campsite[]> {
    return this.campsiteService.getAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: number): Promise<Campsite> {
    return this.campsiteService.getOne(id);
  }

  @Post()
  async createOne(@Body() campsite: CampsiteDTO): Promise<Campsite> {
    return this.campsiteService.createOne(campsite);
  }

  @Put()
  async updateOne(@Body() campsite: CampsiteDTO): Promise<Campsite> {
    return this.campsiteService.updateOne(campsite);
  }

  @Delete(':id')
  async deleteOne(@Param('id') id: number): Promise<Campsite> {
    return this.campsiteService.deleteOne(id);
  }
}
