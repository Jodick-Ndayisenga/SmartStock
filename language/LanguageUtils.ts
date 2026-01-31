// language/LanguageUtils.ts
export enum LangCode {
  ki = 'ki',
  fr = 'fr',
  sw = 'sw',
  en = 'en',
}

export const availableLanguages = [
  { code: LangCode.ki, name: 'Kirundi', nativeName: 'Ikirundi' },
  { code: LangCode.fr, name: 'French', nativeName: 'Français' },
  { code: LangCode.sw, name: 'Swahili', nativeName: 'Kiswahili' },
  { code: LangCode.en, name: 'English', nativeName: 'English' },
];

export const getLanguageName = (code: LangCode): string => {
  return availableLanguages.find(lang => lang.code === code)?.name || 'Kirundi';
};

export const getNativeLanguageName = (code: LangCode): string => {
  return availableLanguages.find(lang => lang.code === code)?.nativeName || 'Ikirundi';
};