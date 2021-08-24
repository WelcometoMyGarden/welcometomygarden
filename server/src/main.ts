import * as helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Welcome To My Garden API Docs')
    .setVersion('0.0.1')
    .build();
  SwaggerModule.setup('/', app, SwaggerModule.createDocument(app, config));

  app.use(helmet());
  await app.listen(5000);
}
bootstrap();
