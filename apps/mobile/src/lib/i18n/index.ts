import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  AppLanguage, DEFAULT_LANGUAGE, pickLanguage,
} from './language';
import { en } from './locales/en';
import { fr } from './locales/fr';

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: pickLanguage(getLocales().map((locale) => locale.languageCode)),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  // Resources are bundled: initialise synchronously so the first render is translated.
  initAsync: false,
});

export async function changeLanguage (language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
}

export {
  type AppLanguage, SUPPORTED_LANGUAGES,
} from './language';
