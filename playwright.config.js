import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173/', trace: 'off' },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 180000
  },
  projects: [
    { name: 'mac', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /campo/ },
    { name: 'ipad', use: { ...devices['iPad (gen 7) landscape'], browserName: 'chromium', defaultBrowserType: 'chromium' }, testMatch: /campo/ }
  ]
});
