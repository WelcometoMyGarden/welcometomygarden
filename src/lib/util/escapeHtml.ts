/**
 * Escape a string for safe insertion into HTML that is rendered via Svelte's
 * `{@html ...}` directive (e.g. when interpolating user-controlled values into
 * an i18n message that also contains trusted markup).
 *
 * Escape the untrusted value with this, then wrap it in the trusted markup —
 * never the other way around, or the wrapping tags render as literal text.
 */
export const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
