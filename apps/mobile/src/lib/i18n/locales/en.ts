import type { Catalogue } from './catalogue';
import type { fr } from './fr';

export const en: Catalogue<typeof fr> = {
  common: {
    retry: 'Try again',
    cancel: 'Cancel',
    save: 'Save',
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
  tabs: {
    today: 'Today',
    tanks: 'Tanks',
    household: 'Household',
    account: 'Account',
  },
  today: {
    eyebrow: 'Today',
    soon: 'Today’s tasks and overdue ones will show here with the routines.',
  },
  tanks: {
    title: 'Tanks',
    soon: 'Your tank list arrives in the next version.',
  },
  household: {
    eyebrow: 'Your household',
    timezone: 'Time zone: {{zone}}',
    error: 'Your household could not be loaded.',
    none: 'You are not part of any household. Join one with an invite.',
    roles: {
      owner: 'Owner',
      member: 'Member',
    },
    rename: {
      action: 'Rename the household',
      label: 'Household name',
      required: 'The household needs a name.',
    },
    members: {
      title: 'Members',
      error: 'The members could not be loaded.',
      you: '{{name}} (you)',
      promote: 'Make owner',
      demote: 'Remove owner role',
      remove: 'Remove from household',
      removeTitle: 'Remove {{name}} from the household?',
      removeBody: 'They will no longer see the household’s tanks or routines.',
      leave: 'Leave the household',
      leaveTitle: 'Leave the household?',
      leaveBody: 'You will no longer see its tanks or routines. Coming back takes a new invite.',
    },
    errors: {
      lastOwner: 'The household must keep at least one owner. Make someone else owner first.',
      forbidden: 'Only an owner can do this.',
      failed: 'That did not work. Check your connection and try again.',
    },
    invite: {
      action: 'Invite someone',
      title: 'Invite',
      explain: 'An invite link lasts one week and can be used by ten people.',
      create: 'Create a link',
      empty: 'No invite in progress.',
      error: 'The invites could not be loaded.',
      usage: '{{used}} of {{max}} uses · until {{date}}',
      share: 'Share',
      revoke: 'Revoke',
      shareMessage: 'Join the “{{household}}” household on Pethouse: {{url}} (code {{code}})',
    },
    join: {
      action: 'I have an invite code',
      title: 'Join a household',
      explain: 'Paste the link you received or type the invite code.',
      label: 'Link or code',
      invalid: 'This is neither an invite link nor a code.',
      submit: 'Continue',
    },
    redeem: {
      title: 'Invite',
      heading: 'Join a household',
      code: 'Code',
      explain: 'You will see its tanks and routines and get its reminders. It becomes the household shown in the app.',
      submit: 'Join',
      errors: {
        invalid: 'This invite does not exist, has expired or has been used up.',
        failed: 'That did not work. Check your connection and try again.',
      },
    },
  },
  account: {
    title: 'Account',
    error: 'Your account could not be loaded.',
    saveFailed: 'That was not saved. Try again.',
  },
  notFound: {
    title: 'This page does not exist',
    back: 'Back to the start',
  },
};
