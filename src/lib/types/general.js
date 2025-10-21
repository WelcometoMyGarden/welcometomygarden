// This file is in JS + JSDoc for interop with svelte.config.js
//
export const SUPPORTED_LANGUAGES = /** @type {const} */ (['en', 'nl', 'fr', 'de', 'es']);
/**
 * @typedef {(typeof SUPPORTED_LANGUAGES)[number]} SupportedLanguage
 */
export const MAIN_LANGUAGES = /** @type {const} */ (['en', 'nl', 'fr']);
/**
 * @typedef {(typeof MAIN_LANGUAGES)[number]} MainLanguage
 */
export const DEFAULT_LANGUAGE = /** @type {const} */ 'en';
