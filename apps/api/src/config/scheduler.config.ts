import { registerAs } from '@nestjs/config';
import { envBool } from './env';
import { SchedulerConfig } from './types';

export default registerAs('scheduler', (): SchedulerConfig => ({
  enabled: envBool('SCHEDULER_ENABLED', true),
}));
