import { inviteCodeFrom } from './invite-code';

describe('inviteCodeFrom', () => {
  it.each([
    ['Ab3_x-9kLmNo', 'Ab3_x-9kLmNo'],
    ['  Ab3_x-9kLmNo\n', 'Ab3_x-9kLmNo'],
    ['pethouse://invite/Ab3_x-9kLmNo', 'Ab3_x-9kLmNo'],
    ['Rejoins-moi : pethouse://invite/Ab3_x-9kLmNo', 'Ab3_x-9kLmNo'],
    ['https://pethouse.kataiga.fr/invite/Ab3_x-9kLmNo?ref=sms', 'Ab3_x-9kLmNo'],
  ])('reads %j', (input, code) => {
    expect(inviteCodeFrom(input)).toBe(code);
  });

  it.each([[''], ['abc'], ['not a code at all'], ['pethouse://invite/']])('rejects %j', (input) => {
    expect(inviteCodeFrom(input)).toBeNull();
  });
});
