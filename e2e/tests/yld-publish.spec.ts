import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || 'https://renderforge.endlessmaker.com';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

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

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${name}.png`), fullPage: true });
  console.log(`  [screenshot] ${name}.png`);
}

test.describe('YLD-Intro Renders + Telegram Publish', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.waitForTimeout(1_000);
    const needsLogin = await page.locator('input[type="email"]').isVisible().catch(() => false);
    if (needsLogin) {
      await page.fill('input[type="email"]', 'admin@renderforge.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2_000);
    }
  });

  test('Screenshot renders page with yld-intro renders', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(3_000);
    await screenshot(page, 'yld-01-renders-completed');

    // Check renders via API
    const result = await apiCall(page, 'GET', '/api/renders?perPage=10');
    const renders = result.data?.items ?? [];
    console.log(`Found ${renders.length} renders:`);
    for (const r of renders) {
      console.log(`  ${r.postTitle}: ${r.status} (${(r.fileSize / 1024 / 1024).toFixed(1)} MB, ${(r.durationMs / 1000).toFixed(1)}s)`);
    }

    expect(renders.filter((r: { status: string }) => r.status === 'completed').length).toBeGreaterThanOrEqual(3);
  });

  test('Verify download works for yld-intro render', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // Get first completed render
    const result = await apiCall(page, 'GET', '/api/renders?perPage=1');
    const render = result.data?.items?.[0];
    expect(render?.status).toBe('completed');

    const token = await getToken(page);
    const downloadCheck = await page.evaluate(
      async ({ url, token }) => {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return {
          status: res.status,
          contentType: res.headers.get('content-type'),
          contentDisposition: res.headers.get('content-disposition'),
          size: Number(res.headers.get('content-length') || 0),
          ok: res.ok,
        };
      },
      { url: `${API_URL}/api/renders/${render.id}/download`, token },
    );

    console.log(`Download: status=${downloadCheck.status}, type=${downloadCheck.contentType}, size=${(downloadCheck.size / 1024 / 1024).toFixed(1)} MB`);
    expect(downloadCheck.ok).toBeTruthy();
    expect(downloadCheck.contentType).toContain('video/mp4');

    await screenshot(page, 'yld-02-download-verified');
  });

  test('Publish all 3 renders to Telegram', async ({ page }) => {
    test.setTimeout(5 * 60_000);

    await page.goto('/social');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'yld-03-social-page');

    // Find Telegram account
    const socialResult = await apiCall(page, 'GET', '/api/social/accounts');
    const accounts = socialResult.data ?? [];
    const telegram = accounts.find((a: { provider: string }) => a.provider === 'telegram');
    expect(telegram).toBeTruthy();
    console.log(`Telegram: ${telegram.accountName} (${telegram.id})`);

    // Get completed renders
    const rendersResult = await apiCall(page, 'GET', '/api/renders?perPage=10');
    const renders = rendersResult.data?.items ?? [];
    const completed = renders.filter((r: { status: string }) => r.status === 'completed');

    console.log(`Publishing ${completed.length} renders to Telegram...`);

    const scheduledIds: string[] = [];

    for (const render of completed) {
      const pubResult = await apiCall(page, 'POST', '/api/publishing', {
        postId: render.postId,
        renderId: render.id,
        socialAccountIds: [telegram.id],
      });

      console.log(`  Scheduled: ${render.postTitle} — status ${pubResult.status}`);
      const id = pubResult.data?.items?.[0]?.id;
      if (id) scheduledIds.push(id);
    }

    await screenshot(page, 'yld-04-publish-queued');

    // Wait for all to publish
    const maxWait = 4 * 60_000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await page.waitForTimeout(10_000);

      const statusResult = await apiCall(page, 'GET', '/api/publishing?perPage=20');
      const items = statusResult.data?.items ?? [];

      let allDone = true;
      for (const id of scheduledIds) {
        const item = items.find((i: { id: string }) => i.id === id);
        if (!item) continue;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`  [${elapsed}s] ${item.postTitle}: ${item.status}${item.error ? ` — ${item.error}` : ''}`);
        if (item.status !== 'published' && item.status !== 'failed') allDone = false;
      }

      if (allDone) break;
    }

    // Final check
    const finalResult = await apiCall(page, 'GET', '/api/publishing?perPage=20');
    const finalItems = finalResult.data?.items ?? [];
    const published = finalItems.filter((i: { status: string }) => i.status === 'published');
    console.log(`\n${published.length} published to Telegram`);
    for (const p of published) {
      console.log(`  ${p.postTitle}: platformPostId=${p.platformPostId}`);
    }

    await page.goto('/social');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'yld-05-published-success');

    expect(published.length).toBeGreaterThanOrEqual(1);
  });

  test('Final screenshots', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'yld-06-final-dashboard');

    await page.goto('/renders');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'yld-06-final-renders');

    await page.goto('/content');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'yld-06-final-content');

    console.log('\n=== YLD-INTRO PIPELINE COMPLETE ===');
  });
});
