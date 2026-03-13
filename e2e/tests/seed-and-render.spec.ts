import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * E2E: Seed YLD Content + Create Render
 *
 * Seeds a YLD motivational post via API, then creates a render
 * and waits for it to complete. Verifies the output is in S3.
 * Takes screenshots at every step.
 */

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
  console.log(`  Screenshot saved: ${name}.png`);
}

// YLD Post content — "Your Mind Is A Control Room"
const YLD_POST = {
  title: 'Your Mind Is A Control Room',
  theme: 'mindset',
  templateId: 'motivational-narration',
  format: 'story',
  metadata: {
    sceneProps: {
      scenes: [
        {
          text: 'CONTROL ROOM',
          subtext: 'Your mind is a control room',
          highlight: 'CONTROL ROOM',
          entrance: 'scaleIn',
          textSize: 64,
          subtextSize: 28,
          textAlign: 'center',
          startFrame: 45,
          durationFrames: 120,
        },
        {
          text: 'WHO IS RUNNING YOUR MIND',
          subtext: 'Every single day, thousands of thoughts pass through your head',
          highlight: 'WHO IS RUNNING YOUR MIND',
          entrance: 'slideUp',
          textSize: 56,
          subtextSize: 24,
          textAlign: 'center',
          startFrame: 165,
          durationFrames: 120,
        },
        {
          text: 'FAITH',
          subtext: 'Imagine inside your head there are two operators',
          highlight: 'FAITH',
          entrance: 'fadeIn',
          textSize: 56,
          subtextSize: 28,
          textAlign: 'center',
          startFrame: 285,
          durationFrames: 120,
        },
        {
          text: 'CHOOSES',
          subtext: 'You are not your thoughts',
          highlight: 'CHOOSES',
          entrance: 'slideLeft',
          textSize: 60,
          subtextSize: 28,
          textAlign: 'center',
          startFrame: 405,
          durationFrames: 120,
        },
        {
          text: 'FOLLOW FOR DAILY\nMINDSET SHIFTS',
          subtext: 'If this hit different, save it',
          entrance: 'slam',
          textSize: 48,
          subtextSize: 26,
          textAlign: 'center',
          startFrame: 525,
          durationFrames: 120,
        },
      ],
      title: 'YOUR LAST DOLLAR',
      accentColor: '#22c55e',
      bgGradient: ['#0a2e1a', '#071a10', '#020a05'],
      particlesEnabled: true,
      transitionFrames: 15,
      introHoldFrames: 45,
    },
  },
  scenes: [
    {
      sortOrder: 0,
      key: 'intro',
      displayText: 'CONTROL ROOM',
      narrationText: 'Your mind is a control room. And right now, someone else is pressing the buttons.',
      entrance: 'scaleIn',
      textSize: '64',
      extraProps: { subtext: 'Your mind is a control room', highlight: 'control room' },
    },
    {
      sortOrder: 1,
      key: 'headline',
      displayText: 'WHO IS RUNNING YOUR MIND',
      narrationText: 'Every single day, thousands of thoughts pass through your head. Most of them are not even yours.',
      entrance: 'slideUp',
      textSize: '56',
      extraProps: { subtext: 'Every single day, thousands of thoughts pass through your head', highlight: 'who is running your mind', subtextSize: 24 },
    },
    {
      sortOrder: 2,
      key: 'subheader',
      displayText: 'FAITH',
      narrationText: 'Imagine inside your head there are two operators. One runs fear. The other runs faith.',
      entrance: 'fadeIn',
      textSize: '56',
      extraProps: { subtext: 'Imagine inside your head there are two operators', highlight: 'faith' },
    },
    {
      sortOrder: 3,
      key: 'badge',
      displayText: 'CHOOSES',
      narrationText: 'You are not your thoughts. You are the one who chooses which thoughts to believe.',
      entrance: 'slideLeft',
      textSize: '60',
      extraProps: { subtext: 'You are not your thoughts', highlight: 'chooses' },
    },
    {
      sortOrder: 4,
      key: 'cta',
      displayText: 'FOLLOW FOR DAILY MINDSET SHIFTS',
      narrationText: 'If this hit different, save it. Share it with someone who needs to hear it.',
      entrance: 'slam',
      textSize: '48',
      extraProps: { subtext: 'If this hit different, save it', subtextSize: 26 },
    },
  ],
};

test.describe('Seed & Render YLD Content', () => {
  test.describe.configure({ mode: 'serial' });

  let nicheId: string;
  let postId: string;
  let renderId: string;

  test('Step 1: Clean all existing renders', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);
    await screenshot(page, '01-renders-before-clean');

    const result = await apiCall(page, 'GET', '/api/renders?perPage=100');
    const renders = result.data?.items ?? [];
    console.log(`Found ${renders.length} existing renders to clean`);

    for (const render of renders) {
      await apiCall(page, 'DELETE', `/api/renders/${render.id}`);
      console.log(`  Deleted render: ${render.postTitle || render.id}`);
    }

    // Also fix any stuck posts in "rendering" status
    const postsResult = await apiCall(page, 'GET', '/api/posts?perPage=50');
    const posts = postsResult.data?.items ?? [];
    for (const post of posts) {
      if (post.status === 'rendering') {
        await apiCall(page, 'PATCH', `/api/posts/${post.id}/status`, { status: 'draft' });
        console.log(`  Reset stuck post: ${post.title} -> draft`);
      }
    }

    await page.reload();
    await page.waitForTimeout(2_000);
    await screenshot(page, '01-renders-after-clean');
  });

  test('Step 2: Find motivational niche', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2_000);
    await screenshot(page, '02-dashboard');

    const result = await apiCall(page, 'GET', '/api/niches');
    const niches = result.data?.items ?? result.data ?? [];
    console.log(`Found ${niches.length} niches`);

    const motivational = niches.find((n: { slug: string }) => n.slug === 'motivational');
    expect(motivational).toBeTruthy();

    nicheId = motivational.id;
    console.log(`Motivational niche ID: ${nicheId}`);
  });

  test('Step 3: Create YLD post with scenes', async ({ page }) => {
    await page.goto('/content');
    await page.waitForTimeout(2_000);
    await screenshot(page, '03-content-before');

    const result = await apiCall(page, 'POST', '/api/posts', {
      nicheId,
      ...YLD_POST,
    });

    console.log(`Create post response: ${result.status}`);
    expect(result.status).toBe(201);
    expect(result.data?.id).toBeTruthy();

    postId = result.data.id;
    console.log(`Created YLD post: ${postId} — "${YLD_POST.title}"`);

    // Verify post appears in UI
    await page.reload();
    await page.waitForTimeout(3_000);
    await screenshot(page, '03-content-after-create');

    await expect(
      page.getByText(YLD_POST.title).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Step 4: Create render via API', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);
    await screenshot(page, '04-renders-before');

    const result = await apiCall(page, 'POST', '/api/renders', {
      postId,
      format: 'story',
    });

    console.log(`Create render response: ${result.status}`, JSON.stringify(result.data));
    expect(result.status).toBe(201);

    renderId = result.data.id;
    console.log(`Created render: ${renderId}`);

    await page.reload();
    await page.waitForTimeout(2_000);
    await screenshot(page, '04-render-created');
  });

  test('Step 5: Wait for render to complete', async ({ page }) => {
    test.setTimeout(8 * 60_000); // 8 min timeout

    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // If renderId not set (running this step standalone), find the latest render
    if (!renderId) {
      const latest = await apiCall(page, 'GET', '/api/renders?perPage=1');
      const items = latest.data?.items ?? [];
      if (items.length > 0) {
        renderId = items[0].id;
        console.log(`Found latest render: ${renderId} (${items[0].status})`);
      } else {
        test.skip();
        return;
      }
    }

    const maxWait = 7 * 60_000;
    const pollInterval = 10_000;
    const startTime = Date.now();
    let screenshotCount = 0;

    let lastStatus = '';
    let lastProgress = 0;

    while (Date.now() - startTime < maxWait) {
      const result = await apiCall(page, 'GET', `/api/renders/${renderId}`);
      const render = result.data;

      if (!render) {
        console.log('Render not found, waiting...');
        await page.waitForTimeout(pollInterval);
        continue;
      }

      const { status, progress, outputUrl, fileSize, error } = render;

      if (status !== lastStatus || progress !== lastProgress) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[${elapsed}s] Render ${renderId}: ${status} ${progress}%${outputUrl ? ` -> ${outputUrl}` : ''}`);
        lastStatus = status;
        lastProgress = progress;

        // Take screenshot on significant status changes
        if (status !== lastStatus || screenshotCount === 0 || progress % 25 === 0) {
          await page.reload();
          await page.waitForTimeout(1_500);
          await screenshot(page, `05-render-progress-${screenshotCount++}-${status}-${progress}pct`);
        }
      }

      if (status === 'completed') {
        console.log(`\nRender completed!`);
        console.log(`  Output URL: ${outputUrl}`);
        console.log(`  File size: ${fileSize ? (fileSize / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'}`);

        await page.reload();
        await page.waitForTimeout(2_000);
        await screenshot(page, '05-render-completed');

        expect(outputUrl).toBeTruthy();
        return;
      }

      if (status === 'failed') {
        console.error(`\nRender FAILED: ${error}`);
        await page.reload();
        await page.waitForTimeout(2_000);
        await screenshot(page, '05-render-FAILED');

        expect.soft(status, `Render failed: ${error}`).not.toBe('failed');
        return;
      }

      await page.waitForTimeout(pollInterval);
    }

    // If we get here, render didn't complete in time
    const finalResult = await apiCall(page, 'GET', `/api/renders/${renderId}`);
    console.log(`Render timed out. Final state:`, JSON.stringify(finalResult.data, null, 2));
    await screenshot(page, '05-render-TIMEOUT');
    expect.soft(false, `Render did not complete within ${maxWait / 60_000} minutes`).toBeTruthy();
  });

  test('Step 6: Verify render output downloadable', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // Find renderId if not set
    if (!renderId) {
      const latest = await apiCall(page, 'GET', '/api/renders?status=completed&perPage=1');
      const items = latest.data?.items ?? [];
      if (items.length > 0) renderId = items[0].id;
    }

    const result = await apiCall(page, 'GET', `/api/renders/${renderId}`);
    const render = result.data;

    // Skip if render didn't complete
    if (render?.status !== 'completed' || !render?.outputUrl) {
      console.log(`Skipping download check — render status: ${render?.status}, outputUrl: ${render?.outputUrl}`);
      await screenshot(page, '06-render-not-completed');
      test.skip();
      return;
    }

    await screenshot(page, '06-renders-completed-list');

    // Verify download endpoint works (follow redirects — manual mode returns opaque status 0 in browser)
    const token = await getToken(page);
    const downloadCheck = await page.evaluate(
      async ({ url, token }) => {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          redirect: 'follow',
        });
        return {
          status: res.status,
          contentType: res.headers.get('content-type'),
          size: Number(res.headers.get('content-length') || 0),
          ok: res.ok,
        };
      },
      { url: `${API_URL}/api/renders/${renderId}/download`, token },
    );

    console.log(`Download endpoint: status=${downloadCheck.status}, type=${downloadCheck.contentType}, size=${downloadCheck.size}`);
    expect(downloadCheck.ok).toBeTruthy();

    expect(render.fileSize).toBeGreaterThan(0);
    expect(render.durationMs).toBeGreaterThan(0);
    console.log(`  File size: ${(render.fileSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Duration: ${(render.durationMs / 1000).toFixed(1)}s`);
  });

  test('Step 7: Verify in MinIO/S3 via presigned URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Find renderId if not set
    if (!renderId) {
      const latest = await apiCall(page, 'GET', '/api/renders?status=completed&perPage=1');
      const items = latest.data?.items ?? [];
      if (items.length > 0) renderId = items[0].id;
    }

    const result = await apiCall(page, 'GET', `/api/renders/${renderId}`);
    const render = result.data;

    if (render?.status !== 'completed' || !render?.outputUrl) {
      console.log('Skipping S3 check — render not completed');
      test.skip();
      return;
    }

    const s3Key = render.outputUrl;
    console.log(`S3 key: ${s3Key}`);

    const token = await getToken(page);
    const fileCheck = await page.evaluate(
      async ({ url, token }) => {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          redirect: 'follow',
        });
        return {
          status: res.status,
          contentType: res.headers.get('content-type'),
          size: Number(res.headers.get('content-length') || 0),
          ok: res.ok,
        };
      },
      { url: `${API_URL}/api/renders/${renderId}/download`, token },
    );

    console.log(`S3 file check: status=${fileCheck.status}, type=${fileCheck.contentType}, size=${fileCheck.size}`);

    expect(fileCheck.ok).toBeTruthy();

    await screenshot(page, '07-final-dashboard');
    console.log('\nE2E PASS: YLD content seeded, rendered, and output verified in MinIO/S3');
  });
});
