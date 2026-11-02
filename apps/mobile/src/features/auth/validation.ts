/** Keys under `auth.errors` in the catalogues. */
export type FieldError =
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordTooShort'
  | 'passwordTooLong'
  | 'displayNameRequired'
  | 'displayNameTooLong';

/** Same limits as the API's RegisterDto; the server stays the authority. */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_MAX_LENGTH = 128;

export const DISPLAY_NAME_MAX_LENGTH = 80;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignInFields {
  email: string;
  password: string;
}

export interface SignUpFields extends SignInFields {
  displayName: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, FieldError>>;

function emailError (email: string): FieldError | undefined {
  return EMAIL.test(email.trim()) ? undefined : 'emailInvalid';
}

/** Sign-in only checks the shape of the email and that a password was typed. */
export function validateSignIn (fields: SignInFields): FieldErrors<SignInFields> {
  const errors: FieldErrors<SignInFields> = {};
  const email = emailError(fields.email);

  if (email) {
    errors.email = email;
  }

  if (fields.password.length === 0) {
    errors.password = 'passwordRequired';
  }

  return errors;
}

export function validateSignUp (fields: SignUpFields): FieldErrors<SignUpFields> {
  const errors: FieldErrors<SignUpFields> = {};
  const email = emailError(fields.email);
  const name = fields.displayName.trim();

  if (email) {
    errors.email = email;
  }

  if (fields.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = 'passwordTooShort';
  } else if (fields.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = 'passwordTooLong';
  }

  if (name.length === 0) {
    errors.displayName = 'displayNameRequired';
  } else if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    errors.displayName = 'displayNameTooLong';
  }

  return errors;
}

export function hasErrors<T> (errors: FieldErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}
