import { registerAs } from '@nestjs/config';
import {
  envWithDefault, optionalEnv,
} from './env';
import { PushConfig } from './types';

export default registerAs('push', (): PushConfig => ({
  expoAccessToken: optionalEnv('EXPO_ACCESS_TOKEN'),
  expoApiUrl: envWithDefault('EXPO_PUSH_URL', 'https://exp.host/--/api/v2/push'),
}));
