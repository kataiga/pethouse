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
  welcome: {
    title: 'Pethouse',
    tagline: 'Aquariums, terrariums and paludariums, looked after together.',
    api: {
      checking: 'Reaching the server…',
      ok: 'Server reachable',
      degraded: 'Server reachable, some services degraded',
      down: 'Server unreachable',
    },
  },
  notFound: {
    title: 'This page does not exist',
    back: 'Back to the start',
  },
};
