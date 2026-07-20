/**
 * Whether the app is running against a non-production host — localhost, a local network IP,
 * bs-local.com (Browserstack), a staging deploy, ... — rather than the live
 * welcometomygarden.org domain. Used to surface development-only affordances such as the
 * local project indicator and the live map zoom-level readout.
 */
export const isLocalProject = (hostname: string): boolean =>
  !hostname.endsWith('welcometomygarden.org');

/**
 * Human-readable label of the active Firebase project when running on a non-production host,
 * or `null` on production. Rendered as a small indicator so we can tell which project is active
 * (e.g. on localhost, a local network IP, bs-local.com (Browserstack), ...).
 */
export const getLocalEnvString = (hostname: string): string | null =>
  isLocalProject(hostname) ? `local project: ${import.meta.env.VITE_FIREBASE_PROJECT_ID}` : null;
