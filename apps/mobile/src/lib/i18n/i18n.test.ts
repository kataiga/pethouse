import { pickLanguage } from './language';
import { en } from './locales/en';
import { fr } from './locales/fr';

type Tree = { [key: string]: string | Tree };

function leaves (tree: Tree, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]): [string, string][] => (
    typeof value === 'string' ? [[`${prefix}${key}`, value]] : leaves(value, `${prefix}${key}.`)
  ));
}

describe('catalogues', () => {
  it('have exactly the same keys in French and English', () => {
    expect(leaves(en).map(([key]) => key)).toEqual(leaves(fr).map(([key]) => key));
  });

  it('have no empty value', () => {
    for (const [key, value] of [...leaves(fr), ...leaves(en)]) {
      expect([key, value.trim().length > 0]).toEqual([key, true]);
    }
  });
});

describe('pickLanguage', () => {
  it('takes the first supported device language, region ignored', () => {
    expect(pickLanguage(['de', 'en-GB', 'fr'])).toBe('en');
    expect(pickLanguage(['fr-CA'])).toBe('fr');
  });

  it('falls back to French', () => {
    expect(pickLanguage(['de', null])).toBe('fr');
    expect(pickLanguage([])).toBe('fr');
  });
});
