import envIsTrue from '$lib/util/env-is-true';
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

const localWebServers = [
  ...(process.env.USE_PREVIEW === 'true'
    ? // Run compiled demo frontend (which is most similar to production)
      [
        {
          // Option A
          // Firebase Hosting is more likely to reflect the production server behavior
          command: 'zsh -il -c "yarn build:demo"',
          // [ ] Also change when testing this:
          //  - FRONTEND_URL in api/.env.local
          //  - PUBLIC_WTMG_HOST in .env.local
          url: BASE_URL,
          // Option B
          // Vite preview server
          // command: 'npm run build:demo && npm run preview',
          // url: 'http://localhost:4173',
          reuseExistingServer: !process.env.CI,
          stdout: 'pipe' as const
        }
      ]
    : // Run dev server
      [
        {
          command: 'zsh -il -c "yarn dev"',
          // Health check URL
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          stdout: 'pipe' as const
        }
      ]),
  // Run unseeded backend
  {
    command: 'zsh -il -c "firebase --project demo-test emulators:start"',
    // "URL of your http server that is expected to return a 2xx, 3xx, 400, 401, 402, or 403 status code when the server is ready to accept connections."
    // Empirically, we observered that sendMessage (a Cloud Task function) is the last function to be intitialized (it returns a 400 then),
    // Luckily, it also is a http function.
    url: 'http://127.0.0.1:5001/demo-test/europe-west1/sendMessage',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    timeout: 40 * 1000
  },
  {
    command: 'mailpit',
    url: 'http://127.0.0.1:8025',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    timeout: 2000
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
  testDir: './tests/e2e',
  timeout: 80 * 1000,
  webServer: localWebServers,
  use: {
    ...defaultOptions,
    ...slowMoChromium
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
