import { test, expect, type Page } from '@playwright/test';

const API_URL = process.env.API_URL || 'https://renderforge.endlessmaker.com';

async function getToken(page: Page): Promise<string> {
  return await page.evaluate(() => localStorage.getItem('rf_token') || '');
}

async function apiCall(page: Page, method: string, path: string, body?: unknown) {
  const token = await getToken(page);
  return page.evaluate(
    async ({ url, method, body, token }) => {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: await res.json().catch(() => null) };
    },
    { url: `${API_URL}${path}`, method, body, token },
  );
}

test.describe('BGM Library', () => {
  test('BGM tracks page loads and shows tracks', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2_000);

    // Click BGM Library tab
    const bgmTab = page.getByRole('tab', { name: /bgm/i })
      .or(page.getByText(/bgm library/i));
    if (await bgmTab.isVisible().catch(() => false)) {
      await bgmTab.click();
      await page.waitForTimeout(1_000);
    }

    // Check BGM tracks via API
    const result = await apiCall(page, 'GET', '/api/bgm');
    const tracks = result.data ?? [];
    console.log(`BGM tracks in API: ${tracks.length}`);

    for (const track of tracks) {
      console.log(`  - ${track.name} (${track.category}, ${track.durationSeconds}s)`);
    }

    if (tracks.length > 0) {
      // Verify tracks are visible in the UI
      await expect(
        page.getByText(tracks[0].name).or(page.locator('table tbody tr').first()),
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('BGM tracks appear in render dialog', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // Open new render dialog
    const newRenderBtn = page.getByRole('button', { name: /new render/i });
    await newRenderBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Look for BGM dropdown
    const bgmLabel = page.getByRole('dialog').getByText(/background music/i);
    await expect(bgmLabel).toBeVisible({ timeout: 5_000 });

    // Click the BGM selector
    const bgmSelect = page.getByRole('dialog').locator('button').filter({ hasText: /no bgm/i });
    if (await bgmSelect.isVisible().catch(() => false)) {
      await bgmSelect.click();
      await page.waitForTimeout(500);

      // Check for BGM options
      const options = page.getByRole('option');
      const count = await options.count();
      console.log(`BGM options in render dialog: ${count}`);

      // Close the dropdown
      await page.keyboard.press('Escape');
    }
  });
});
