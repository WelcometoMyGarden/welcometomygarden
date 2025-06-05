export const SUPPORTED_LANGUAGES = ['en', 'nl', 'fr', 'de', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const MAIN_LANGUAGES = ['en', 'nl', 'fr'] as const;
export type MainLanguage = (typeof MAIN_LANGUAGES)[number];
export const DEFAULT_LANGUAGE = 'en' as const;
