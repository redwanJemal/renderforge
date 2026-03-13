import { test as setup, expect } from '@playwright/test';

const email = process.env.TEST_USER_EMAIL || 'admin@renderforge.com';
const password = process.env.TEST_USER_PASSWORD || 'admin123';

setup('authenticate admin', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Fill login form
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard (off /login)
  await page.waitForURL(url => !url.toString().includes('/login'), {
    timeout: 15_000,
  });

  // Verify we're authenticated
  await page.waitForTimeout(2_000);
  await expect(page.locator('body')).not.toContainText('Login failed');

  // Save auth state
  await page.context().storageState({ path: '.auth/admin.json' });
});
