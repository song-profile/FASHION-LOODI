import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /(?:journey|typography)\.spec\.ts/,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100', reducedMotion: 'no-preference', trace: 'retain-on-failure' },
  projects: [
    { name: 'ios-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'ios-webkit-small', use: { ...devices['iPhone SE'] } },
    { name: 'bundle-chromium', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'bundle-chromium-small', use: { ...devices['iPhone SE'], defaultBrowserType: 'chromium' } },
  ],
  webServer: { command: 'node scripts/preview-mobile.mjs', url: 'http://127.0.0.1:3100', reuseExistingServer: false },
});
