import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CampsiteService } from 'src/modules/campsite/campsite.service';
import { Campsite } from '@prisma/client';

@ApiTags('campsite')
@Controller('campsite')
export class CampsiteController {
  constructor(private campsiteService: CampsiteService) {}
}
