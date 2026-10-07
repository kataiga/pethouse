import { Module } from '@nestjs/common';
import { LoggerModule as PinoModule } from 'nestjs-pino';
import { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { loggerConfig } from '../../config';

@Module({
  imports: [
    PinoModule.forRootAsync({
      inject: [loggerConfig.KEY],
      useFactory: (logger: ConfigType<typeof loggerConfig>) => ({
        pinoHttp: {
          level: logger.level,
          genReqId: () => randomUUID(),
          autoLogging: true,
          transport: logger.pretty
            ? {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
                translateTime: 'HH:MM:ss.l',
              },
            }
            : undefined,
        },
      }),
    }),
  ],
})
export class LoggerModule {}
