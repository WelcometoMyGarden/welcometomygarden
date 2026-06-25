import { registerPlugin } from '@capacitor/core';

/**
 * Runtime backend-channel switching for the native apps.
 *
 * The native apps load the WTMG web app from a remote host configured via Capacitor's `server.url`
 * (baked at `cap sync` time, see `capacitor.config.ts`). This plugin lets testers/developers switch
 * that host at runtime (production / beta / staging / a custom URL). The chosen URL is persisted in
 * native storage and the webview is rebuilt against it. When nothing is persisted, the app uses the
 * baked `server.url` as the default.
 *
 * Native-only: there is no web implementation (on the web the host is fixed by the deployment).
 * The native side is implemented in `WtmgServerPlugin` (iOS/Android).
 */

export interface WtmgServerConfig {
  /** The server URL the webview is currently loaded from. */
  current: string;
  /** The baked-in default server URL (from `capacitor.config.json`), used when no override is set. */
  baseline: string;
  /** Whether a user-chosen override is currently persisted. */
  isPersisted: boolean;
}

export interface WtmgServerPlugin {
  /** Returns the active URL, the baked default, and whether an override is persisted. */
  getConfig(): Promise<WtmgServerConfig>;
  /** Persists `url` as the override and rebuilds the webview against it. */
  setUrl(options: { url: string }): Promise<void>;
  /** Clears any persisted override and rebuilds the webview against the baked default. */
  reset(): Promise<void>;
}

const notNative = () =>
  Promise.reject(new Error('WtmgServer is only available on native platforms'));

export const WtmgServer = registerPlugin<WtmgServerPlugin>('WtmgServer', {
  web: {
    getConfig: notNative,
    setUrl: notNative,
    reset: notNative
  }
});

export interface ServerChannelPreset {
  label: string;
  url: string;
}

/** Preset backend channels offered in the switcher UI. A custom URL is also allowed. */
export const CHANNEL_PRESETS: ServerChannelPreset[] = [
  { label: 'Production', url: 'https://welcometomygarden.org' },
  { label: 'Beta', url: 'https://beta.welcometomygarden.org' },
  { label: 'Staging', url: 'https://staging.welcometomygarden.org' }
];

/** Whether `url` is a syntactically valid http(s) URL we can load. */
export const isValidServerUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Normalizes a URL for comparison (drops a single trailing slash on the root path). */
export const normalizeServerUrl = (url: string): string => url.replace(/\/$/, '');
