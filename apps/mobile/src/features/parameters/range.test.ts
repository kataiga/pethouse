import {
  formatValue, isOutOfRange, parseReading, parseThresholds, withUnit,
} from './range';

describe('isOutOfRange', () => {
  it.each([
    [7, 6.5, 7.5, false],
    [6.5, 6.5, 7.5, false],
    [7.5, 6.5, 7.5, false],
    [6.4, 6.5, 7.5, true],
    [7.6, 6.5, 7.5, true],
    [100, null, 50, true],
    [-5, 0, null, true],
    [1000, null, null, false],
  ])('%p within [%p, %p] → %p', (value, min, max, expected) => {
    expect(isOutOfRange(value, min, max)).toBe(expected);
  });
});

describe('formatValue', () => {
  it('shows exactly the definition’s decimals, in the person’s language', () => {
    expect(formatValue(7, 1, 'fr')).toBe('7,0');
    expect(formatValue(7.25, 1, 'en')).toBe('7.3');
    expect(formatValue(1200, 0, 'fr')).toBe('1200');
    expect(withUnit('24,5', '°C')).toBe('24,5 °C');
    expect(withUnit('7,2', '')).toBe('7,2');
  });
});

describe('parseReading', () => {
  it.each([
    ['', 1, { value: null }],
    ['7,2', 1, { value: 7.2 }],
    ['-1.5', 1, { value: -1.5 }],
    ['12', 0, { value: 12 }],
    ['7.25', 1, { error: 'tooPrecise' }],
    ['1.5', 0, { error: 'tooPrecise' }],
    ['7,2,1', 2, { error: 'invalid' }],
    ['abc', 1, { error: 'invalid' }],
  ])('reads %p with %p decimals', (text, decimals, expected) => {
    expect(parseReading(text, decimals)).toEqual(expected);
  });
});

describe('parseThresholds', () => {
  it('accepts open bounds and refuses an inverted range', () => {
    expect(parseThresholds('6,5', '', 1)).toEqual({
      ok: true,
      value: {
        min: 6.5,
        max: null,
      },
    });
    expect(parseThresholds('8', '7', 1)).toEqual({
      ok: false,
      maxError: 'inverted',
    });
    expect(parseThresholds('x', '7.55', 1)).toEqual({
      ok: false,
      minError: 'invalid',
      maxError: 'tooPrecise',
    });
  });
});
