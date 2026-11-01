import { registerAs } from '@nestjs/config';
import { optionalEnv } from './env';
import { PushConfig } from './types';

export default registerAs('push', (): PushConfig => ({
  expoAccessToken: optionalEnv('EXPO_ACCESS_TOKEN'),
}));
