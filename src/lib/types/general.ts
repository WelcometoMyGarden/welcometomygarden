export const SUPPORTED_LANGUAGES = ['en', 'nl', 'fr', 'de', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
