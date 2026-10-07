import { Module } from '@nestjs/common';
import { LoggerModule as PinoModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Module({
  imports: [
    PinoModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = config.get('logger');

        return {
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
        };
      },
    }),
  ],
})
export class LoggerModule {}
