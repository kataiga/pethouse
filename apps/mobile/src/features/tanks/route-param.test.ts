import { idParam } from './route-param';

describe('idParam', () => {
  it.each([
    ['42', 42],
    [['7', '8'], 7],
    ['0', null],
    ['-1', null],
    ['4a', null],
    ['', null],
    [undefined, null],
  ])('reads %p', (value, expected) => {
    expect(idParam(value)).toBe(expected);
  });
});
