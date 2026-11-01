export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'fr';

function isSupported (code: string): code is AppLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

/** First supported language among the device preferences, French otherwise. */
export function pickLanguage (deviceLanguages: readonly (string | null)[]): AppLanguage {
  for (const code of deviceLanguages) {
    const base = code?.toLowerCase().split('-')[0];

    if (base !== undefined && isSupported(base)) {
      return base;
    }
  }

  return DEFAULT_LANGUAGE;
}
