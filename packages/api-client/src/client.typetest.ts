/**
 * Compile-time contract checks, run by `npm run typecheck`. Nothing here executes. Each
 * `@ts-expect-error` must stay an error: if the spec loses a path parameter or a required body
 * field, the directive becomes unused and the typecheck fails.
 */
import {
  createApiClient, type Schemas,
} from './index';

const api = createApiClient({ baseUrl: 'http://localhost' });

export async function wellTyped (): Promise<Schemas['RoutineResponseDto'][] | undefined> {
  const { data } = await api.GET('/api/tanks/{tankId}/routines', { params: { path: { tankId: 42 } } });
  // Nullable response fields are always present.
  const description: string | null | undefined = data?.[0].description;
  void description;

  return data;
}

export function misuse (): void {
  // @ts-expect-error path parameters are numbers
  void api.GET('/api/tanks/{tankId}/routines', { params: { path: { tankId: 'forty-two' } } });
  // @ts-expect-error guarded routes still declare their path parameter
  void api.GET('/api/households/{householdId}/tanks', {});
  // @ts-expect-error a routine needs its rule and its start
  void api.POST('/api/tanks/{tankId}/routines', { params: { path: { tankId: 1 } }, body: { name: 'Feeding' } });
  // @ts-expect-error unknown paths do not exist
  void api.GET('/api/does-not-exist');
}
