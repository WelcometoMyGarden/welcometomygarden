import { Module } from '@nestjs/common';
import { PrismaModule } from '../../config/prisma/prisma.module';
import { CampsiteController } from './campsite.controller';
import { CampsiteService } from './campsite.service';

@Module({
  imports: [PrismaModule],
  controllers: [CampsiteController],
  providers: [CampsiteService],
})
export class CampsiteModule {}
