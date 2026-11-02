import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100', reducedMotion: 'no-preference', trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'compact', testMatch: /journey\.spec\.ts/, use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', viewport: { width: 320, height: 568 }, screen: { width: 320, height: 568 }, deviceScaleFactor: 2 } },
    { name: 'desktop', testMatch: /journey\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: { command: 'npm run start -- --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: false, timeout: 30000 },
});
