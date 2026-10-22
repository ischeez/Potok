import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    { command: 'npm run dev -w @potok/api', url: 'http://localhost:3001/api/health', reuseExistingServer: !process.env.CI, timeout: 90_000 },
    { command: 'npm run dev -w @potok/web', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI, timeout: 90_000 },
  ],
});
