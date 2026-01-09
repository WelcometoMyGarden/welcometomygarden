import envIsTrue from './src/lib/util/env-is-true';
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.test.local') });

const USE_SLOWMO = process.env.USE_SLOWMO ?? false;

const BASE_URL = process.env.BASE_URL;

const slowMoChromium = USE_SLOWMO
  ? // ...devices['Desktop Chrome'],
    {
      launchOptions: {
        slowMo: 100
      }
    }
  : {};

const localwebServers = [
  ...(envIsTrue(process.env.USE_PREVIEW) && BASE_URL?.endsWith(':4173')
    ? // Run compiled demo frontend (which is most similar to production) as a Vite Preview server
      // the alternative is the built-in preview server
      [
        {
          // Vite preview server
          command: `${!envIsTrue(process.env.SKIP_BUILD) ? 'yarn build:demo && ' : ''} yarn preview`,
          url: BASE_URL,
          reuseExistingServer: !envIsTrue(process.env.CI),
          stdout: 'pipe' as const
        }
      ]
    : BASE_URL?.endsWith(':5173')
      ? // Run Vite dev server
        [
          {
            command: 'yarn dev',
            // Health check URL
            url: BASE_URL,
            reuseExistingServer: !envIsTrue(process.env.CI),
            stdout: 'pipe' as const
          }
        ]
      : // Don't run a Vite server
        []),
  // Run unseeded backend
  // optionally building the front-end first, if a Firebase Hosting preview server is desired
  // Firebase Hosting is more likely to reflect the production server behavior
  {
    command: `${
      envIsTrue(process.env.USE_PREVIEW) &&
      BASE_URL?.endsWith(':4005') &&
      !envIsTrue(process.env.SKIP_BUILD)
        ? 'yarn build:demo && '
        : ''
    }firebase --project demo-test emulators:start`,
    // "URL of your http server that is expected to return a 2xx, 3xx, 400, 401, 402, or 403 status code when the server is ready to accept connections."
    // Empirically, we observered that sendMessage (a Cloud Task function) is the last function to be intitialized (it returns a 400 then),
    // Luckily, it also is a http function.
    url: 'http://127.0.0.1:5001/demo-test/europe-west1/sendMessage',
    reuseExistingServer: !envIsTrue(process.env.CI),
    stdout: 'pipe',
    // 80/40 seconds for the Firebase backend, 40 seconds for the frontend build,
    timeout:
      ((envIsTrue(process.env.CI) ? 80 : 40) + (!envIsTrue(process.env.SKIP_BUILD) ? 40 : 0)) * 1000
  },
  {
    command: 'mailpit',
    url: 'http://127.0.0.1:8025',
    reuseExistingServer: !envIsTrue(process.env.CI),
    stdout: 'pipe',
    timeout: 5 * 1000
  }
] satisfies PlaywrightTestConfig['webServer'][];

export type TestLocale = 'en' | 'fr';

export type TestOptions = {
  useStripe: boolean;
  useDemoProject: boolean;
};
export const defaultOptions = {
  // custom options
  useStripe: envIsTrue(process.env.USE_STRIPE) ?? false,
  useDemoProject: envIsTrue(process.env.USE_DEMO_PROJECT) ?? true,
  // built-in option https://playwright.dev/docs/api/class-testoptions#test-options-base-url
  baseURL: BASE_URL,
  // built-in option https://playwright.dev/docs/api/class-testoptions#test-options-locale
  // also sets the built-in browser locale
  locale: (process.env.TEST_LOCALE || 'en') as TestLocale
} as const;

export default defineConfig<TestOptions>({
  // Opt out of parallel tests on CI, prevents weird issues indeed
  // https://playwright.dev/docs/ci#workers
  workers: process.env.WORKERS != null ? parseInt(process.env.WORKERS) : undefined,
  testDir: './tests/e2e',
  retries: envIsTrue(process.env.CI) ? 1 : 0,
  timeout: 80 * 1000,
  webServer: localwebServers,
  use: {
    ...defaultOptions,
    ...slowMoChromium,
    trace: 'on-first-retry'
  },
  globalTeardown: './tests/e2e/global-teardown',
  projects: [
    // `type` is a custom option, and it looks like only
    // projects can be parameterized with custom options.
    // See https://playwright.dev/docs/test-parameterize#parameterized-projects
    {
      name: 'Desktop'
    },
    {
      name: 'Mobile',
      use: {
        ...devices['Pixel 4']
      }
    }
  ]
});
