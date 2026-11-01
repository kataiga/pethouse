import createClient, {
  type Client, type ClientOptions,
} from 'openapi-fetch';
import type {
  components, operations, paths,
} from './generated/schema';

export type {
  components, operations, paths,
};

/** Every schema of the API by name, e.g. `Schemas['RoutineResponseDto']`. */
export type Schemas = components['schemas'];

export type ApiClient = Client<paths>;

/** A client bound to the API's base URL, e.g. `https://api.example.com`. Paths include `/api`. */
export function createApiClient (options: ClientOptions): ApiClient {
  return createClient<paths>(options);
}
