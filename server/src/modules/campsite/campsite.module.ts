import { Module } from '@nestjs/common';
import { CampsiteController } from './campsite.controller';
import { CampsiteService } from './campsite/campsite.service';
import { CampsiteService } from './campsite.service';

@Module({
  controllers: [CampsiteController],
  providers: [CampsiteService],
})
export class CampsiteModule {}
