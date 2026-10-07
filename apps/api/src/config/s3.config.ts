import { registerAs } from '@nestjs/config';
import {
  envBool, envWithDefault, requireEnv,
} from './env';
import { S3Config } from './types';

export default registerAs('s3', (): S3Config => ({
  endpoint: requireEnv('S3_ENDPOINT'),
  region: envWithDefault('S3_REGION', 'us-east-1'),
  accessKey: requireEnv('S3_ACCESS_KEY'),
  secretKey: requireEnv('S3_SECRET_KEY'),
  bucket: requireEnv('S3_BUCKET'),
  forcePathStyle: envBool('S3_FORCE_PATH_STYLE', true),
}));
