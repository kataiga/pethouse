import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap/create-app';
import { ProbeController } from './probe.controller';

/** Boots the real application module with the production HTTP pipeline, plus the probe routes. */
export async function createTestApp (): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule.forRoot()],
    controllers: [ProbeController],
  }).compile();

  const app = configureApp(moduleFixture.createNestApplication({ logger: false }));
  await app.init();

  return app;
}
