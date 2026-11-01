import {
  DynamicModule, Module,
} from '@nestjs/common';
import { RoutinesModule } from '@modules/routines/routines.module';
import { LoggingNotificationSender } from './notification/logging-notification-sender';
import { NotificationSender } from './notification/notification-sender';
import { RoutineJobsProcessor } from './processor/routine-jobs.processor';
import { RoutineSchedulerService } from './service/routine-scheduler.service';

export interface SchedulerModuleOptions {
  /** Register the BullMQ worker. Off for tooling booted without Redis. */
  connect: boolean;
}

@Module({})
export class SchedulerModule {
  static forRoot (options: SchedulerModuleOptions): DynamicModule {
    return {
      module: SchedulerModule,
      imports: [RoutinesModule],
      providers: [
        RoutineSchedulerService,
        {
          provide: NotificationSender,
          useClass: LoggingNotificationSender,
        },
        ...options.connect ? [RoutineJobsProcessor] : [],
      ],
      exports: [RoutineSchedulerService, NotificationSender],
    };
  }
}
