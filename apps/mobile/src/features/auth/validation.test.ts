import {
  hasErrors, validateSignIn, validateSignUp,
} from './validation';

describe('validateSignIn', () => {
  it('accepts an email and a password', () => {
    expect(hasErrors(validateSignIn({
      email: ' camille@example.com ',
      password: 'x',
    }))).toBe(false);
  });

  it('flags a malformed email and a missing password', () => {
    expect(validateSignIn({
      email: 'camille@',
      password: '',
    })).toEqual({
      email: 'emailInvalid',
      password: 'passwordRequired',
    });
  });
});

describe('validateSignUp', () => {
  const valid = {
    displayName: 'Camille',
    email: 'camille@example.com',
    password: 'correct horse',
  };

  it('accepts what the API accepts', () => {
    expect(validateSignUp(valid)).toEqual({});
  });

  it('applies the API limits on password and name', () => {
    expect(validateSignUp({
      ...valid,
      password: 'short',
      displayName: '   ',
    })).toEqual({
      password: 'passwordTooShort',
      displayName: 'displayNameRequired',
    });
    expect(validateSignUp({
      ...valid,
      password: 'x'.repeat(129),
      displayName: 'n'.repeat(81),
    })).toEqual({
      password: 'passwordTooLong',
      displayName: 'displayNameTooLong',
    });
  });
});
