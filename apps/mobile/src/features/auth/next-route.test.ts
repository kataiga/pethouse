import { safeNextRoute } from './next-route';

describe('safeNextRoute', () => {
  it('keeps in-app paths', () => {
    expect(safeNextRoute('/invite/Ab3_x-9kLmNo')).toBe('/invite/Ab3_x-9kLmNo');
    expect(safeNextRoute(['/household', '/other'])).toBe('/household');
  });

  it.each([[undefined], [''], ['household'], ['//evil.example'], ['/redirect?to=https://evil.example'], ['https://evil.example']])(
    'falls back to the start for %j',
    (next) => {
      expect(safeNextRoute(next)).toBe('/');
    },
  );
});
