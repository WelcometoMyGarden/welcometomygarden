import { defineConfig, devices } from '@playwright/test';

const USE_SLOWMO = false;

const slowMoChromium = USE_SLOWMO
  ? {
      ...devices['Desktop Chrome'],
      launchOptions: {
        slowMo: 100
      }
    }
  : {};

export const defaultOptions = { type: 'local', baseURL: 'http://localhost:5173' } as const;

const webServer = [] as const;
// Make this the webserver when testing locally
// TODO: make these background processes run only in the background
const webServer2 = [
  // Run compiled demo frontend (which is most similar to production)
  // {
  //   command: 'npm run build:demo && npm run preview',
  //   // Health check URL
  //   url: 'http://127.0.0.1:4173',
  //   reuseExistingServer: !process.env.CI
  // },
  // Reuse dev server
  {
    command: 'zsh -il -c "yarn dev"',
    // Health check URL
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe'
  },
  // Run unseeded backend
  {
    // command: 'npx firebase --project demo-test emulators:exec --ui api/seeders/simple.js',
    command: 'zsh -il -c "firebase --project demo-test emulators:start"',
    // Use Firebase Emulator Suite UI dashboard as a health check URL
    url: 'http://127.0.0.1:4001',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    timeout: 20 * 1000
  },
  {
    command: 'mailpit',
    url: 'http://127.0.0.1:8025',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    timeout: 2000
  }
];

export type TestType = 'staging' | 'local';

export type TestOptions = {
  options: { type: TestType; baseURL: string };
};

export default defineConfig<TestOptions>({
  testDir: './tests/e2e',
  timeout: 80 * 1000,
  projects: [
    {
      name: 'local',
      use: {
        options: defaultOptions,
        ...slowMoChromium
      }
    },
    {
      name: 'staging',
      use: {
        options: {
          type: 'staging',
          baseURL: 'https://staging.welcometomygarden.org'
        },
        ...slowMoChromium
      }
    }
  ],
  // TODO: this is not relevant for the 'staging' project, but it is not configurable per projects
  // this should probably be refactored into a per-project "setup" (necessitating the reimplementation of
  // health checks and timeouts?)
  webServer,
  globalTeardown: './tests/e2e/global-teardown'
});
