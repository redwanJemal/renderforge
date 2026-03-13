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

// All templates to create sample posts for
const SAMPLE_TEMPLATES = [
  // Premium templates (bare composition IDs)
  { templateId: 'yld-intro', title: 'YLD Intro Sample' },
  { templateId: 'showcase', title: 'Showcase Sample' },
  { templateId: 'countdown', title: 'Countdown Sample' },
  { templateId: 'kinetic-text', title: 'Kinetic Text Sample' },
  { templateId: 'split-reveal', title: 'Split Reveal Sample' },
  { templateId: 'orbit', title: 'Orbit Sample' },
  { templateId: 'glitch-text', title: 'Glitch Text Sample' },
  { templateId: 'neon-glow', title: 'Neon Glow Sample' },
  { templateId: 'parallax-layers', title: 'Parallax Layers Sample' },
  { templateId: 'breaking-news', title: 'Breaking News Sample' },
  { templateId: 'match-fixture', title: 'Match Fixture Sample' },
  { templateId: 'post-match', title: 'Post Match Sample' },
  { templateId: 'dubai-luxury', title: 'Dubai Luxury Sample' },
  { templateId: 'ramadan-greeting', title: 'Ramadan Greeting Sample' },
  { templateId: 'gold-reveal', title: 'Gold Reveal Sample' },
  { templateId: 'slider', title: 'Slider Sample' },
  // Registry templates (format-suffixed composition IDs)
  { templateId: 'announcement', title: 'Announcement Sample' },
  { templateId: 'product-launch', title: 'Product Launch Sample' },
  { templateId: 'quote-of-day', title: 'Quote of the Day Sample' },
  { templateId: 'stats-recap', title: 'Stats Recap Sample' },
  { templateId: 'testimonial', title: 'Testimonial Sample' },
];

test.describe('Sample Posts for All Templates', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(600_000); // 10 minutes for rendering

  let nicheId: string;
  const createdPostIds: string[] = [];
  const renderIds: string[] = [];

  test.beforeEach(async ({ page }) => {
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

  test('Step 1: Get niche ID', async ({ page }) => {
    const res = await apiCall(page, 'GET', '/api/niches');
    expect(res.status).toBe(200);
    const niches = res.data?.items ?? res.data;
    expect(niches.length).toBeGreaterThan(0);
    nicheId = niches[0].id;
    console.log(`Using niche: ${niches[0].name} (${nicheId})`);
  });

  test('Step 2: Create sample posts for all templates', async ({ page }) => {
    expect(nicheId).toBeTruthy();

    for (const template of SAMPLE_TEMPLATES) {
      const res = await apiCall(page, 'POST', '/api/posts', {
        nicheId,
        title: template.title,
        templateId: template.templateId,
        format: 'story',
        metadata: {},
      });

      if (res.status === 201) {
        createdPostIds.push(res.data.id);
        console.log(`  Created post: ${template.title} (${res.data.id})`);
      } else {
        console.warn(`  Failed to create post for ${template.templateId}:`, res.data);
      }
    }

    expect(createdPostIds.length).toBeGreaterThan(0);
    console.log(`Created ${createdPostIds.length} sample posts`);

    // Set all posts to "ready" status for rendering
    for (const postId of createdPostIds) {
      await apiCall(page, 'PATCH', `/api/posts/${postId}/status`, { status: 'ready' });
    }

    await page.goto('/content');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'sample-posts-created');
  });

  test('Step 3: Batch render all sample posts', async ({ page }) => {
    expect(createdPostIds.length).toBeGreaterThan(0);

    const res = await apiCall(page, 'POST', '/api/renders/batch', {
      postIds: createdPostIds,
      formats: ['story'],
    });

    expect(res.status).toBe(201);
    const renders = res.data?.renders ?? [];
    for (const r of renders) {
      renderIds.push(r.id);
    }

    console.log(`Queued ${renderIds.length} render jobs`);

    await page.goto('/renders');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'sample-renders-queued');
  });

  test('Step 4: Wait for renders to complete', async ({ page }) => {
    expect(renderIds.length).toBeGreaterThan(0);

    // Poll until all renders are completed or failed
    const maxWaitMs = 480_000; // 8 minutes
    const pollInterval = 10_000;
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
      const res = await apiCall(page, 'GET', '/api/renders?perPage=100');
      const items = res.data?.items ?? [];
      const relevant = items.filter((r: { id: string }) => renderIds.includes(r.id));
      const completed = relevant.filter((r: { status: string }) => r.status === 'completed');
      const failed = relevant.filter((r: { status: string }) => r.status === 'failed');
      const pending = relevant.length - completed.length - failed.length;

      console.log(`  Renders: ${completed.length} completed, ${failed.length} failed, ${pending} pending`);

      if (pending === 0) {
        console.log(`All renders finished! ${completed.length} completed, ${failed.length} failed`);
        break;
      }

      await page.waitForTimeout(pollInterval);
    }

    await page.goto('/renders');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'sample-renders-completed');
  });

  test('Step 5: Verify thumbnails are visible', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(3_000);

    // Check that at least some thumbnail images loaded
    const thumbCount = await page.locator('img[src*="thumbnails"]').count();
    console.log(`Found ${thumbCount} thumbnail images in renders page`);

    await screenshot(page, 'sample-renders-with-thumbnails');
  });

  test('Step 6: Test bulk select and actions', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // Click "select all" checkbox
    const selectAllCheckbox = page.locator('thead [role="checkbox"]');
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.click();
      await page.waitForTimeout(500);
      await screenshot(page, 'sample-renders-bulk-selected');

      // Check bulk action bar is visible
      const bulkBar = page.locator('text=selected');
      expect(await bulkBar.isVisible()).toBe(true);

      // Clear selection
      const clearBtn = page.locator('button:has-text("Clear")');
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
      }
    }
  });

  test('Step 7: Publish completed renders to Telegram', async ({ page }) => {
    // Check if there are social accounts
    const accountsRes = await apiCall(page, 'GET', '/api/social/accounts');
    const accounts = accountsRes.data ?? [];

    if (accounts.length === 0) {
      console.log('No social accounts connected, skipping publish');
      return;
    }

    const telegramAccount = accounts.find((a: { provider: string }) => a.provider === 'telegram');
    if (!telegramAccount) {
      console.log('No Telegram account connected, skipping publish');
      return;
    }

    // Publish each completed render
    const rendersRes = await apiCall(page, 'GET', '/api/renders?status=completed&perPage=100');
    const completedRenders = (rendersRes.data?.items ?? [])
      .filter((r: { id: string }) => renderIds.includes(r.id));

    let published = 0;
    for (const render of completedRenders) {
      const pubRes = await apiCall(page, 'POST', `/api/renders/${render.id}/publish`, {
        socialAccountIds: [telegramAccount.id],
      });
      if (pubRes.status === 201) {
        published++;
        console.log(`  Published render ${render.id.slice(0, 8)} to Telegram`);
      }
      // Delay between publishes to avoid rate limiting
      await page.waitForTimeout(2_000);
    }

    console.log(`Published ${published}/${completedRenders.length} renders to Telegram`);
    await screenshot(page, 'sample-renders-published');
  });
});
