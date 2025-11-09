import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from './config';
import { ConfigType } from '@nestjs/config';

async function bootstrap ():Promise<void> {
  const app = await NestFactory.create(AppModule);
  const appConfiguration = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  await app.listen(appConfiguration.port);  
}
bootstrap();
