import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Campsite } from '@prisma/client';
import { CampsiteService } from './campsite.service';

@ApiTags('campsite')
@Controller('campsite')
export class CampsiteController {
  constructor(private campsiteService: CampsiteService) {}

  @Get()
  async listAll(): Promise<Campsite[]> {
    return this.campsiteService.findAll();
  }

  @Post()
  async createCampsite(@Body() campsiteData: any): Promise<Campsite> {
    return this.campsiteService.createCampsite(campsiteData);
  }
}
