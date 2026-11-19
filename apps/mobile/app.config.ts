import { existsSync } from 'node:fs';
import type {
  ConfigContext, ExpoConfig,
} from 'expo/config';

/** Firebase's Android config, which FCM needs to deliver push; it is not in the repository. */
const GOOGLE_SERVICES_FILE = './google-services.json';

/**
 * `app.json` holds the configuration; this only adds what depends on the machine building the
 * app. Push delivery on Android needs `google-services.json`: until it is dropped next to this
 * file, builds still work and the app reports notifications as not configured.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'pethouse',
  slug: config.slug ?? 'pethouse',
  android: {
    ...config.android,
    ...(existsSync(GOOGLE_SERVICES_FILE) ? { googleServicesFile: GOOGLE_SERVICES_FILE } : {}),
  },
});
