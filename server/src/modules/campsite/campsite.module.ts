import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { PrismaService } from './../../config/prisma/prisma.service';
import { CampsiteController } from './campsite.controller';
import { CampsiteService } from './campsite.service';

@Module({
  imports: [PrismaModule],
  controllers: [CampsiteController],
  providers: [CampsiteService, PrismaService],
})
export class CampsiteModule {}
