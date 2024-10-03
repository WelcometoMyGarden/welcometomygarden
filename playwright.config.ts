import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          slowMo: 100
        }
      }
    }
  ],
  webServer: [
    // Run compiled demo frontend (which is most similar to production)
    // {
    //   command: 'npm run build:demo && npm run preview',
    //   // Health check URL
    //   url: 'http://127.0.0.1:4173',
    //   reuseExistingServer: !process.env.CI
    // },
    // Reuse dev server
    {
      command: 'npm run dev',
      // Health check URL
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe'
    },
    // Run unseeded backend
    {
      // command: 'npx firebase --project demo-test emulators:exec --ui api/seeders/simple.js',
      command: 'zsh -il -c "nvm use 18 && npm run firebase:demo"',
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
  ],
  globalTeardown: './tests/e2e/global-teardown'
  // use: {
  //   baseURL: 'http://127.0.0.1:4173'
  // }
});
