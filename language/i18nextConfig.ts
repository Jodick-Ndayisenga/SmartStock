// language/i18nextConfig.ts (Simplified)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ki from './json/ki.json';
import fr from './json/fr.json';
import sw from './json/sw.json';
import en from './json/en.json';
import { LangCode } from './LanguageUtils';

const resources = {
  [LangCode.ki]: { translation: ki },
  [LangCode.fr]: { translation: fr },
  [LangCode.sw]: { translation: sw },
  [LangCode.en]: { translation: en },
};

// language/i18nextConfig.ts
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: (callback: (lng: string) => void) => {
    AsyncStorage.getItem('app-language')
      .then((savedLanguage) => {
        if (savedLanguage) {
          console.log('🎯 Using SAVED language from AsyncStorage:', savedLanguage);
          callback(savedLanguage);
        } else {
          console.log('🌍 Using DEFAULT language (Kirundi) - no saved preference');
          callback(LangCode.ki);
        }
      })
      .catch(() => {
        console.log('❌ Error reading AsyncStorage, using DEFAULT (Kirundi)');
        callback(LangCode.ki);
      });
  },
  init: () => {},
  cacheUserLanguage: (lng: string) => {
    console.log('💾 Saving language to AsyncStorage:', lng);
    AsyncStorage.setItem('app-language', lng);
  }
};

let isInitialized = false;

const initializeI18Next = () => {
  if (isInitialized) return;
  
  i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
      debug: __DEV__,
      resources,
      fallbackLng: LangCode.ki,
      compatibilityJSON: 'v4',
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    })
    .then(() => {
      console.log('✅ i18n initialized successfully');
      console.log('🌐 Current language:', i18n.language);
      console.log('📚 Available languages:', Object.keys(resources));
    });
  
  isInitialized = true;
};

export default { initializeI18Next };