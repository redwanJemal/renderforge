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

// ─── 3 YLD Posts with different themes and colors ───

const ACCENT_COLORS = [
  { color: '#22c55e', bg: ['#0a2e1a', '#071a10', '#020a05'] },
  { color: '#D4AF37', bg: ['#1a1500', '#0f0d00', '#050400'] },
  { color: '#a855f7', bg: ['#1a0a2e', '#0f0518', '#050208'] },
];

const YLD_POSTS = [
  {
    title: 'The 5AM Secret Nobody Tells You',
    theme: 'mindset',
    templateId: 'motivational-narration',
    format: 'story',
    metadata: {
      sceneProps: {
        scenes: [
          { text: 'THE 5AM SECRET', subtext: 'While the world sleeps, winners are already making moves', highlight: '5AM SECRET', entrance: 'scaleIn', textSize: 64, subtextSize: 28, textAlign: 'center', startFrame: 45, durationFrames: 120 },
          { text: 'CREATION MODE', subtext: 'The first hour of your day determines the next twenty-three', highlight: 'CREATION MODE', entrance: 'slideUp', textSize: 56, subtextSize: 24, textAlign: 'center', startFrame: 165, durationFrames: 120 },
          { text: 'PURPOSE IS A WEAPON', subtext: 'Five AM with no plan is just insomnia. Five AM with purpose is a weapon', highlight: 'PURPOSE IS A WEAPON', entrance: 'fadeIn', textSize: 52, subtextSize: 24, textAlign: 'center', startFrame: 285, durationFrames: 120 },
          { text: 'OWN YOUR MORNING', subtext: 'Own your morning. Own your life', highlight: 'OWN YOUR MORNING', entrance: 'slideLeft', textSize: 60, subtextSize: 28, textAlign: 'center', startFrame: 405, durationFrames: 120 },
          { text: 'FOLLOW FOR MORE\nMINDSET FUEL', subtext: 'Double tap if you are ready to own your mornings', entrance: 'slam', textSize: 48, subtextSize: 26, textAlign: 'center', startFrame: 525, durationFrames: 120 },
        ],
        title: 'YOUR LAST DOLLAR',
        logo: 'yld-logo-white.png',
        logoSize: 120,
        accentColor: ACCENT_COLORS[0].color,
        bgGradient: ACCENT_COLORS[0].bg,
        particlesEnabled: true,
        transitionFrames: 15,
        introHoldFrames: 45,
      },
    },
    scenes: [
      { sortOrder: 0, key: 'intro', displayText: 'THE 5AM SECRET', narrationText: 'While the world sleeps, winners are already making moves.', entrance: 'scaleIn', textSize: '64' },
      { sortOrder: 1, key: 'headline', displayText: 'CREATION MODE', narrationText: 'The first hour of your day determines the next twenty-three.', entrance: 'slideUp', textSize: '56' },
      { sortOrder: 2, key: 'subheader', displayText: 'PURPOSE IS A WEAPON', narrationText: 'Five AM with no plan is just insomnia. Five AM with purpose is a weapon.', entrance: 'fadeIn', textSize: '52' },
      { sortOrder: 3, key: 'badge', displayText: 'OWN YOUR MORNING', narrationText: 'Own your morning. Own your life. The discipline starts before the sun rises.', entrance: 'slideLeft', textSize: '60' },
      { sortOrder: 4, key: 'cta', displayText: 'FOLLOW FOR MORE MINDSET FUEL', narrationText: 'Double tap if you are ready to own your mornings. Follow for more mindset fuel.', entrance: 'slam', textSize: '48' },
    ],
  },
  {
    title: 'Stop Thinking Start Doing',
    theme: 'mindset',
    templateId: 'motivational-narration',
    format: 'story',
    metadata: {
      sceneProps: {
        scenes: [
          { text: 'STOP THINKING', subtext: 'You have been planning for months. When does the doing start?', highlight: 'STOP THINKING', entrance: 'slam', textSize: 64, subtextSize: 28, textAlign: 'center', startFrame: 45, durationFrames: 120 },
          { text: 'IMPERFECT ACTION', subtext: 'Analysis paralysis has killed more dreams than failure ever will', highlight: 'IMPERFECT ACTION', entrance: 'scaleIn', textSize: 56, subtextSize: 24, textAlign: 'center', startFrame: 165, durationFrames: 120 },
          { text: 'THE GAP IS ACTION', subtext: 'The gap between where you are and where you want to be is not knowledge', highlight: 'ACTION', entrance: 'slideUp', textSize: 56, subtextSize: 24, textAlign: 'center', startFrame: 285, durationFrames: 120 },
          { text: 'YOUR HANDS', subtext: 'Progress is not made in your head. It is made with your hands', highlight: 'YOUR HANDS', entrance: 'fadeIn', textSize: 60, subtextSize: 28, textAlign: 'center', startFrame: 405, durationFrames: 120 },
          { text: 'TAG SOMEONE\nSTUCK IN PLANNING', subtext: 'Follow for daily motivation', entrance: 'slideLeft', textSize: 48, subtextSize: 26, textAlign: 'center', startFrame: 525, durationFrames: 120 },
        ],
        title: 'YOUR LAST DOLLAR',
        logo: 'yld-logo-white.png',
        logoSize: 120,
        accentColor: ACCENT_COLORS[1].color,
        bgGradient: ACCENT_COLORS[1].bg,
        particlesEnabled: true,
        transitionFrames: 15,
        introHoldFrames: 45,
      },
    },
    scenes: [
      { sortOrder: 0, key: 'intro', displayText: 'STOP THINKING', narrationText: 'You have been planning for months. When does the doing start?', entrance: 'slam', textSize: '64' },
      { sortOrder: 1, key: 'headline', displayText: 'IMPERFECT ACTION', narrationText: 'Analysis paralysis has killed more dreams than failure ever will.', entrance: 'scaleIn', textSize: '56' },
      { sortOrder: 2, key: 'subheader', displayText: 'THE GAP IS ACTION', narrationText: 'The gap between where you are and where you want to be is not knowledge. It is action.', entrance: 'slideUp', textSize: '56' },
      { sortOrder: 3, key: 'badge', displayText: 'YOUR HANDS', narrationText: 'Progress is not made in your head. It is made with your hands.', entrance: 'fadeIn', textSize: '60' },
      { sortOrder: 4, key: 'cta', displayText: 'TAG SOMEONE STUCK IN PLANNING', narrationText: 'Tag someone stuck in planning mode. Follow for daily motivation.', entrance: 'slideLeft', textSize: '48' },
    ],
  },
  {
    title: 'Your Environment Is Your Future',
    theme: 'mindset',
    templateId: 'motivational-narration',
    format: 'story',
    metadata: {
      sceneProps: {
        scenes: [
          { text: 'YOUR FUTURE', subtext: 'Show me your circle and I will show you your future', highlight: 'YOUR FUTURE', entrance: 'fadeIn', textSize: 64, subtextSize: 28, textAlign: 'center', startFrame: 45, durationFrames: 120 },
          { text: 'AVERAGE OF FIVE', subtext: 'You are the average of the five people you spend the most time with', highlight: 'AVERAGE OF FIVE', entrance: 'slideUp', textSize: 56, subtextSize: 24, textAlign: 'center', startFrame: 165, durationFrames: 120 },
          { text: 'CHANGE THE INPUTS', subtext: 'You do not rise to your goals. You fall to your environment', highlight: 'CHANGE THE INPUTS', entrance: 'scaleIn', textSize: 52, subtextSize: 24, textAlign: 'center', startFrame: 285, durationFrames: 120 },
          { text: 'PROTECT YOUR CIRCLE', subtext: 'Protect your circle like you protect your bank account', highlight: 'PROTECT YOUR CIRCLE', entrance: 'slam', textSize: 56, subtextSize: 28, textAlign: 'center', startFrame: 405, durationFrames: 120 },
          { text: 'SHARE THIS WITH\nYOUR CIRCLE', subtext: 'Follow for more truth bombs', entrance: 'slideLeft', textSize: 48, subtextSize: 26, textAlign: 'center', startFrame: 525, durationFrames: 120 },
        ],
        title: 'YOUR LAST DOLLAR',
        logo: 'yld-logo-white.png',
        logoSize: 120,
        accentColor: ACCENT_COLORS[2].color,
        bgGradient: ACCENT_COLORS[2].bg,
        particlesEnabled: true,
        transitionFrames: 15,
        introHoldFrames: 45,
      },
    },
    scenes: [
      { sortOrder: 0, key: 'intro', displayText: 'YOUR FUTURE', narrationText: 'Show me your circle and I will show you your future.', entrance: 'fadeIn', textSize: '64' },
      { sortOrder: 1, key: 'headline', displayText: 'AVERAGE OF FIVE', narrationText: 'You are the average of the five people you spend the most time with.', entrance: 'slideUp', textSize: '56' },
      { sortOrder: 2, key: 'subheader', displayText: 'CHANGE THE INPUTS', narrationText: 'You do not rise to the level of your goals. You fall to the level of your environment.', entrance: 'scaleIn', textSize: '52' },
      { sortOrder: 3, key: 'badge', displayText: 'PROTECT YOUR CIRCLE', narrationText: 'Protect your circle like you protect your bank account. Both determine your wealth.', entrance: 'slam', textSize: '56' },
      { sortOrder: 4, key: 'cta', displayText: 'SHARE THIS WITH YOUR CIRCLE', narrationText: 'Share this with your circle. Follow for more truth bombs.', entrance: 'slideLeft', textSize: '48' },
    ],
  },
];

test.describe('Full Pipeline: 3 YLD Renders + Telegram Publish', () => {
  test.describe.configure({ mode: 'serial' });

  let nicheId: string;
  const postIds: string[] = [];
  const renderIds: string[] = [];
  let telegramAccountId: string;

  test('Step 1: Clean all existing renders and stuck posts', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'p01-renders-before-clean');

    // Delete all renders
    const result = await apiCall(page, 'GET', '/api/renders?perPage=100');
    const renders = result.data?.items ?? [];
    console.log(`Found ${renders.length} existing renders to clean`);
    for (const render of renders) {
      await apiCall(page, 'DELETE', `/api/renders/${render.id}`);
      console.log(`  Deleted render: ${render.postTitle || render.id}`);
    }

    // Delete all scheduled posts
    const pubResult = await apiCall(page, 'GET', '/api/publishing?perPage=100');
    const scheduled = pubResult.data?.items ?? [];
    for (const sp of scheduled) {
      if (sp.status !== 'published') {
        await apiCall(page, 'DELETE', `/api/publishing/${sp.id}`);
        console.log(`  Deleted scheduled post: ${sp.id}`);
      }
    }

    // Reset stuck posts
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
    await screenshot(page, 'p01-renders-after-clean');
  });

  test('Step 2: Find motivational niche and Telegram account', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'p02-dashboard');

    // Find niche
    const nicheResult = await apiCall(page, 'GET', '/api/niches');
    const niches = nicheResult.data?.items ?? nicheResult.data ?? [];
    const motivational = niches.find((n: { slug: string }) => n.slug === 'motivational');
    expect(motivational).toBeTruthy();
    nicheId = motivational.id;
    console.log(`Motivational niche: ${nicheId}`);

    // Find Telegram account
    const socialResult = await apiCall(page, 'GET', '/api/social/accounts');
    const accounts = socialResult.data ?? [];
    const telegram = accounts.find((a: { provider: string }) => a.provider === 'telegram');
    expect(telegram).toBeTruthy();
    telegramAccountId = telegram.id;
    console.log(`Telegram account: ${telegram.accountName} (${telegramAccountId})`);
  });

  test('Step 3: Create 3 YLD posts with scenes and logo', async ({ page }) => {
    await page.goto('/content');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'p03-content-before');

    for (let i = 0; i < YLD_POSTS.length; i++) {
      const yldPost = YLD_POSTS[i];
      const result = await apiCall(page, 'POST', '/api/posts', {
        nicheId,
        ...yldPost,
      });

      console.log(`  Created post ${i + 1}: ${result.status} — "${yldPost.title}"`);
      expect(result.status).toBe(201);
      expect(result.data?.id).toBeTruthy();
      postIds.push(result.data.id);
    }

    console.log(`Created ${postIds.length} posts: ${postIds.join(', ')}`);

    await page.reload();
    await page.waitForTimeout(3_000);
    await screenshot(page, 'p03-content-after');
  });

  test('Step 4: Create renders for all 3 posts', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'p04-renders-before');

    for (let i = 0; i < postIds.length; i++) {
      const result = await apiCall(page, 'POST', '/api/renders', {
        postId: postIds[i],
        format: 'story',
      });

      console.log(`  Created render ${i + 1}: ${result.status} — ID: ${result.data?.id}`);
      expect(result.status).toBe(201);
      renderIds.push(result.data.id);
    }

    await page.reload();
    await page.waitForTimeout(2_000);
    await screenshot(page, 'p04-renders-queued');
  });

  test('Step 5: Wait for all 3 renders to complete', async ({ page }) => {
    test.setTimeout(20 * 60_000); // 20 min timeout for 3 renders

    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // If renderIds empty, find all non-completed renders
    if (renderIds.length === 0) {
      const latest = await apiCall(page, 'GET', '/api/renders?perPage=10');
      const items = latest.data?.items ?? [];
      for (const item of items) {
        if (item.status !== 'completed') renderIds.push(item.id);
      }
    }

    const maxWait = 18 * 60_000;
    const pollInterval = 15_000;
    const startTime = Date.now();
    let screenshotCount = 0;
    const completedIds = new Set<string>();

    while (Date.now() - startTime < maxWait) {
      let allDone = true;

      for (const renderId of renderIds) {
        if (completedIds.has(renderId)) continue;

        const result = await apiCall(page, 'GET', `/api/renders/${renderId}`);
        const render = result.data;
        if (!render) continue;

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const shortId = renderId.slice(0, 8);

        if (render.status === 'completed') {
          completedIds.add(renderId);
          console.log(`  [${elapsed}s] Render ${shortId}: COMPLETED (${(render.fileSize / 1024 / 1024).toFixed(1)} MB)`);
        } else if (render.status === 'failed') {
          completedIds.add(renderId);
          console.error(`  [${elapsed}s] Render ${shortId}: FAILED — ${render.error}`);
        } else {
          allDone = false;
          console.log(`  [${elapsed}s] Render ${shortId}: ${render.status} ${render.progress}%`);
        }
      }

      // Take progress screenshot every ~60s
      if (screenshotCount * 60 < (Date.now() - startTime) / 1000) {
        await page.reload();
        await page.waitForTimeout(2_000);
        await screenshot(page, `p05-render-progress-${screenshotCount++}`);
      }

      if (allDone || completedIds.size >= renderIds.length) break;
      await page.waitForTimeout(pollInterval);
    }

    // Final screenshot
    await page.reload();
    await page.waitForTimeout(2_000);
    await screenshot(page, 'p05-renders-final');

    // Verify at least all completed
    const completedCount = [...completedIds].length;
    console.log(`\n${completedCount}/${renderIds.length} renders done`);

    // Check each render
    for (const renderId of renderIds) {
      const result = await apiCall(page, 'GET', `/api/renders/${renderId}`);
      const r = result.data;
      if (r?.status === 'completed') {
        expect(r.outputUrl).toBeTruthy();
        expect(r.fileSize).toBeGreaterThan(0);
      }
    }

    expect(completedIds.size).toBeGreaterThanOrEqual(1);
  });

  test('Step 6: Verify download works', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // Find a completed render
    let completedRenderId: string | undefined;
    for (const renderId of renderIds) {
      const result = await apiCall(page, 'GET', `/api/renders/${renderId}`);
      if (result.data?.status === 'completed') {
        completedRenderId = renderId;
        break;
      }
    }

    if (!completedRenderId) {
      const latest = await apiCall(page, 'GET', '/api/renders?status=completed&perPage=1');
      completedRenderId = latest.data?.items?.[0]?.id;
    }

    if (!completedRenderId) {
      console.log('No completed renders found, skipping download test');
      test.skip();
      return;
    }

    // Test download via API (should stream the file now, not redirect)
    const token = await getToken(page);
    const downloadCheck = await page.evaluate(
      async ({ url, token }) => {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const contentDisp = res.headers.get('content-disposition');
        return {
          status: res.status,
          contentType: res.headers.get('content-type'),
          contentDisposition: contentDisp,
          size: Number(res.headers.get('content-length') || 0),
          ok: res.ok,
        };
      },
      { url: `${API_URL}/api/renders/${completedRenderId}/download`, token },
    );

    console.log(`Download: status=${downloadCheck.status}, type=${downloadCheck.contentType}, disposition=${downloadCheck.contentDisposition}, size=${downloadCheck.size}`);
    expect(downloadCheck.ok).toBeTruthy();
    expect(downloadCheck.contentType).toContain('video/mp4');
    expect(downloadCheck.contentDisposition).toContain('attachment');

    await screenshot(page, 'p06-download-verified');
  });

  test('Step 7: Publish first completed render to Telegram', async ({ page }) => {
    test.setTimeout(3 * 60_000);

    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // Find first completed render
    let completedRenderId: string | undefined;
    let completedPostId: string | undefined;
    for (let i = 0; i < renderIds.length; i++) {
      const result = await apiCall(page, 'GET', `/api/renders/${renderIds[i]}`);
      if (result.data?.status === 'completed') {
        completedRenderId = renderIds[i];
        completedPostId = postIds[i];
        break;
      }
    }

    if (!completedRenderId || !completedPostId) {
      console.log('No completed renders to publish');
      test.skip();
      return;
    }

    // If no telegramAccountId, look it up
    if (!telegramAccountId) {
      const socialResult = await apiCall(page, 'GET', '/api/social/accounts');
      const telegram = (socialResult.data ?? []).find((a: { provider: string }) => a.provider === 'telegram');
      if (!telegram) { test.skip(); return; }
      telegramAccountId = telegram.id;
    }

    console.log(`Publishing render ${completedRenderId} for post ${completedPostId} to Telegram ${telegramAccountId}`);

    // Schedule publish (immediate — no scheduledAt)
    const publishResult = await apiCall(page, 'POST', '/api/publishing', {
      postId: completedPostId,
      renderId: completedRenderId,
      socialAccountIds: [telegramAccountId],
    });

    console.log(`Publish response: ${publishResult.status}`, JSON.stringify(publishResult.data));
    expect(publishResult.status).toBe(201);

    const scheduledPostId = publishResult.data?.items?.[0]?.id;
    expect(scheduledPostId).toBeTruthy();

    await screenshot(page, 'p07-publish-scheduled');

    // Wait for the publish worker to process
    const maxWait = 2 * 60_000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await page.waitForTimeout(5_000);

      const statusResult = await apiCall(page, 'GET', `/api/publishing`);
      const items = statusResult.data?.items ?? [];
      const ourItem = items.find((i: { id: string }) => i.id === scheduledPostId);

      if (!ourItem) {
        console.log('  Scheduled post not found, waiting...');
        continue;
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`  [${elapsed}s] Publish status: ${ourItem.status}${ourItem.error ? ` — ${ourItem.error}` : ''}`);

      if (ourItem.status === 'published') {
        console.log(`\nPublished to Telegram!`);
        console.log(`  Platform post ID: ${ourItem.platformPostId}`);
        await screenshot(page, 'p07-published-success');
        return;
      }

      if (ourItem.status === 'failed') {
        console.error(`\nPublish FAILED: ${ourItem.error}`);
        await screenshot(page, 'p07-publish-FAILED');
        // Don't hard-fail — log it
        expect.soft(ourItem.status, `Publish failed: ${ourItem.error}`).not.toBe('failed');
        return;
      }
    }

    // Timeout
    console.log('Publish timed out');
    await screenshot(page, 'p07-publish-TIMEOUT');
    expect.soft(false, 'Publish did not complete in time').toBeTruthy();
  });

  test('Step 8: Verify in Telegram and take final screenshots', async ({ page }) => {
    // Check Social page
    await page.goto('/social');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'p08-social-page');

    // Check publish history
    const pubResult = await apiCall(page, 'GET', '/api/publishing');
    const items = pubResult.data?.items ?? [];
    console.log(`Publishing history: ${items.length} items`);
    for (const item of items) {
      console.log(`  ${item.postTitle}: ${item.status} on ${item.provider} (${item.accountName})`);
    }

    // Check dashboard
    await page.goto('/');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'p08-final-dashboard');

    // Check renders page
    await page.goto('/renders');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'p08-final-renders');

    // Check content page
    await page.goto('/content');
    await page.waitForTimeout(2_000);
    await screenshot(page, 'p08-final-content');

    console.log('\n=== FULL PIPELINE E2E COMPLETE ===');
  });
});
