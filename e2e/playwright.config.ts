import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  timeout: 120_000, // 2 min per test (renders take time)
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'admin-setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || 'https://renderforge.endlessmaker.com',
      },
    },
    {
      name: 'admin',
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.BASE_URL || 'https://renderforge.endlessmaker.com',
        storageState: '.auth/admin.json',
      },
      dependencies: ['admin-setup'],
    },
  ],
});
