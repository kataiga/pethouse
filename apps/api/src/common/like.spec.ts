import {
  containsPattern, escapeLike,
} from './like';

describe('escapeLike', () => {
  it('escapes the LIKE wildcards and the escape character itself', () => {
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
    expect(containsPattern('betta')).toBe('%betta%');
  });
});
