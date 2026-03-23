export interface LanguageConfig {
  code: string;
  label: string;
  nativeLabel: string;
}

export const supportedLanguages: LanguageConfig[] = [
  { code: 'zh', label: 'Simplified Chinese', nativeLabel: '中文 (简体)' },
  { code: 'en', label: 'English (US)', nativeLabel: 'English' },
];

export const defaultLanguage = 'zh';

export function isValidLanguage(code: string): code is LanguageConfig['code'] {
  return supportedLanguages.some(lang => lang.code === code);
}

export function getLanguageLabel(code: string): string {
  const config = supportedLanguages.find(lang => lang.code === code);
  return config?.nativeLabel ?? code;
}
