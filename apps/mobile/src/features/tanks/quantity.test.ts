import { parseQuantity } from './quantity';

describe('parseQuantity', () => {
  it.each([
    ['1', 1],
    [' 12 ', 12],
    ['10000', 10_000],
    ['0', null],
    ['10001', null],
    ['1.5', null],
    ['-2', null],
    ['', null],
  ])('reads %p', (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });
});
