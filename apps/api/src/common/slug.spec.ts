import { slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Eau noire / Blackwater', 'eau-noire-blackwater'],
    ['  Récif  ', 'recif'],
    ['Nano-cube 30L', 'nano-cube-30l'],
    ['!!!', ''],
  ])('turns %p into %p', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('caps the length without leaving a trailing dash', () => {
    expect(slugify('a'.repeat(39) + ' b', 40)).toBe('a'.repeat(39));
  });
});
