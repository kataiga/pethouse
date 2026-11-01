import { BullModule } from '@nestjs/bullmq';
import {
  DynamicModule, Global, Module,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { redisConfig } from '@config';
import { ROUTINE_QUEUE } from './queue.constants';
import { BullRoutineQueue } from './bull-routine-queue';
import { DisconnectedRoutineQueue } from './disconnected-routine-queue';
import { RoutineQueue } from './routine-queue';

export interface QueueModuleOptions {
  /** Connect to Redis. Off for tooling that only needs the module graph. */
  connect: boolean;
}

@Global()
@Module({})
export class QueueModule {
  static forRoot (options: QueueModuleOptions): DynamicModule {
    if (!options.connect) {
      return {
        module: QueueModule,
        providers: [{
          provide: RoutineQueue,
          useClass: DisconnectedRoutineQueue,
        }],
        exports: [RoutineQueue],
      };
    }

    const bull = [
      BullModule.forRootAsync({
        inject: [redisConfig.KEY],
        useFactory: (redis: ConfigType<typeof redisConfig>) => ({
          connection: {
            host: redis.host,
            port: redis.port,
            password: redis.password,
          },
          prefix: redis.prefix,
        }),
      }),
      BullModule.registerQueue({ name: ROUTINE_QUEUE }),
    ];

    return {
      module: QueueModule,
      imports: bull,
      providers: [{
        provide: RoutineQueue,
        useClass: BullRoutineQueue,
      }],
      exports: [RoutineQueue, ...bull],
    };
  }
}
