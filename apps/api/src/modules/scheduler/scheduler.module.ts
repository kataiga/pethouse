import {
  DynamicModule, Module,
} from '@nestjs/common';
import { RoutinesModule } from '@modules/routines/routines.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
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
      imports: [RoutinesModule, NotificationsModule],
      providers: [
        RoutineSchedulerService,
        ...options.connect ? [RoutineJobsProcessor] : [],
      ],
      exports: [RoutineSchedulerService],
    };
  }
}
