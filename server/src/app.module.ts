import { Module } from '@nestjs/common';
import { PrismaModule } from './config/prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CampsiteModule } from './modules/campsite/campsite.module';

@Module({
  imports: [PrismaModule, CampsiteModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
