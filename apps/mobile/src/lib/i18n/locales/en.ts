import type { Catalogue } from './catalogue';
import type { fr } from './fr';

export const en: Catalogue<typeof fr> = {
  common: {
    retry: 'Try again',
  },
  language: {
    label: 'Language',
    fr: 'Français',
    en: 'English',
  },
  theme: {
    label: 'Display',
    dark: 'Night',
    light: 'Day',
  },
  welcome: {
    eyebrow: 'Aquariums · terrariums · paludariums',
    tagline: 'Aquariums, terrariums and paludariums, looked after together.',
  },
  auth: {
    fields: {
      displayName: 'First name or nickname',
      email: 'Email',
      password: 'Password',
    },
    signIn: {
      title: 'Sign in',
      submit: 'Sign in',
      toSignUp: 'No account yet? Create one',
    },
    signUp: {
      title: 'Create an account',
      submit: 'Create my account',
      toSignIn: 'Already have an account? Sign in',
    },
    errors: {
      emailInvalid: 'Enter a valid email address.',
      passwordRequired: 'Enter your password.',
      passwordTooShort: 'At least {{count}} characters.',
      passwordTooLong: 'This password is too long.',
      displayNameRequired: 'Say what the members of your household call you.',
      displayNameTooLong: 'This name is too long.',
      invalidCredentials: 'Wrong email or password.',
      emailTaken: 'An account already exists with this email.',
      rejected: 'The server refused these details. Check them and try again.',
      network: 'The server cannot be reached. Check your connection and try again.',
    },
  },
  session: {
    loading: 'Opening your session…',
    unreachable: {
      title: 'Server unreachable',
      body: 'Your session is kept. Check your connection, then try again.',
    },
  },
  home: {
    eyebrow: 'Pethouse',
    greeting: 'Hello {{name}}',
    households: {
      title: 'Your households',
      empty: 'You are not part of any household.',
      error: 'Your households could not be loaded.',
    },
    signOut: 'Sign out',
  },
  notFound: {
    title: 'This page does not exist',
    back: 'Back to the start',
  },
};
