import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from './config';
import { ConfigType } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

async function bootstrap ():Promise<void> {
  const app = await NestFactory.create(AppModule);
  const appConfiguration = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
  app.useLogger(app.get(Logger));
  await app.listen(appConfiguration.port);  
}
bootstrap();
