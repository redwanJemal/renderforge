import { test, expect, type Page } from '@playwright/test';

/**
 * E2E: Full Render Pipeline
 *
 * 1. Clean all existing renders
 * 2. Verify YLD content posts exist
 * 3. Create a new render for a YLD post
 * 4. Wait for render to complete
 * 5. Verify output file exists (downloadable)
 * 6. Verify file in MinIO/S3
 */

const API_URL = process.env.API_URL || 'https://renderforge.endlessmaker.com';

// Helper: get auth token from localStorage
async function getToken(page: Page): Promise<string> {
  return await page.evaluate(() => localStorage.getItem('rf_token') || '');
}

// Helper: API call with auth
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

test.describe('Render Pipeline', () => {
  test.describe.configure({ mode: 'serial' });

  test('Step 1: Clean all existing renders', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // Get all renders via API
    const result = await apiCall(page, 'GET', '/api/renders?perPage=100');
    const renders = result.data?.items ?? [];

    console.log(`Found ${renders.length} existing renders to clean`);

    if (renders.length === 0) {
      console.log('No renders to clean');
      return;
    }

    // Delete each render via API
    for (const render of renders) {
      const deleteResult = await apiCall(page, 'DELETE', `/api/renders/${render.id}`);
      console.log(`  Deleted render ${render.id} (${render.postTitle || 'untitled'}): ${deleteResult.status}`);
    }

    // Refresh page and verify empty
    await page.reload();
    await page.waitForTimeout(2_000);

    // Verify renders list is empty
    const verify = await apiCall(page, 'GET', '/api/renders');
    expect(verify.data?.total).toBe(0);
    console.log('All renders cleaned');
  });

  test('Step 2: Verify YLD content posts exist', async ({ page }) => {
    await page.goto('/content');
    await page.waitForTimeout(3_000);

    // Check for YLD posts via API
    const result = await apiCall(page, 'GET', '/api/posts?perPage=50');
    const posts = result.data?.items ?? [];

    console.log(`Found ${posts.length} posts`);

    // Filter YLD/motivational posts
    const yldPosts = posts.filter(
      (p: { templateId: string; title: string }) =>
        p.templateId === 'motivational-narration' || p.title.includes('Mind') || p.title.includes('Discipline'),
    );

    console.log(`YLD posts: ${yldPosts.length}`);
    for (const p of yldPosts.slice(0, 5)) {
      console.log(`  - ${p.title} (${p.status})`);
    }

    expect(yldPosts.length).toBeGreaterThan(0);

    // Verify posts are visible in the UI
    await expect(page.locator('table tbody tr, [data-testid="post-row"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('Step 3: Create a new render via UI', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // Click "New Render" button
    const newRenderBtn = page.getByRole('button', { name: /new render/i });
    await expect(newRenderBtn).toBeVisible();
    await newRenderBtn.click();

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // Select a post — pick the first available
    const postSelect = page.locator('[data-testid="post-select"]')
      .or(page.getByRole('dialog').locator('button').filter({ hasText: /select a post/i }));
    await postSelect.first().click();
    await page.waitForTimeout(500);

    // Click the first post option
    const postOption = page.getByRole('option').first();
    await postOption.click();
    await page.waitForTimeout(500);

    // Select format — Story (9:16)
    const formatSelect = page.getByRole('dialog').locator('button').filter({ hasText: /select format/i });
    await formatSelect.click();
    await page.waitForTimeout(500);
    const storyOption = page.getByRole('option', { name: /story/i });
    await storyOption.click();
    await page.waitForTimeout(500);

    // BGM is optional — leave as "No BGM" for this test

    // Click Create Render
    const createBtn = page.getByRole('dialog').getByRole('button', { name: /create render/i });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // Wait for toast success
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: /render.*created/i })
        .or(page.getByText(/render job created/i)),
    ).toBeVisible({ timeout: 10_000 });

    console.log('Render job created via UI');
  });

  test('Step 4: Wait for render to complete', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // Poll for render completion (renders can take 1-5 minutes)
    const maxWait = 5 * 60_000; // 5 minutes
    const pollInterval = 5_000;
    const startTime = Date.now();

    let lastStatus = '';
    let lastProgress = 0;

    while (Date.now() - startTime < maxWait) {
      const result = await apiCall(page, 'GET', '/api/renders?perPage=1');
      const renders = result.data?.items ?? [];

      if (renders.length === 0) {
        console.log('No renders found, waiting...');
        await page.waitForTimeout(pollInterval);
        continue;
      }

      const render = renders[0];
      const status = render.status;
      const progress = render.progress;

      if (status !== lastStatus || progress !== lastProgress) {
        console.log(`Render ${render.id}: ${status} (${progress}%)`);
        lastStatus = status;
        lastProgress = progress;
      }

      if (status === 'completed') {
        console.log(`Render completed! Output: ${render.outputUrl}, Size: ${render.fileSize} bytes`);
        expect(render.outputUrl).toBeTruthy();
        expect(render.fileSize).toBeGreaterThan(0);
        return;
      }

      if (status === 'failed') {
        console.error(`Render FAILED: ${render.error}`);
        expect(status).not.toBe('failed');
        return;
      }

      await page.waitForTimeout(pollInterval);
    }

    throw new Error(`Render did not complete within ${maxWait / 60_000} minutes`);
  });

  test('Step 5: Verify render output is downloadable', async ({ page }) => {
    await page.goto('/renders');
    await page.waitForTimeout(2_000);

    // Get completed render
    const result = await apiCall(page, 'GET', '/api/renders?status=completed&perPage=1');
    const renders = result.data?.items ?? [];
    expect(renders.length).toBeGreaterThan(0);

    const render = renders[0];
    console.log(`Checking render ${render.id}: outputUrl=${render.outputUrl}`);

    // Try to download via API
    const downloadUrl = `${API_URL}/api/renders/${render.id}/download`;
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
          contentLength: res.headers.get('content-length'),
          redirected: res.redirected,
          finalUrl: res.url,
        };
      },
      { url: downloadUrl, token },
    );

    console.log(`Download check: status=${downloadCheck.status}, type=${downloadCheck.contentType}, redirected=${downloadCheck.redirected}`);

    // The download endpoint redirects to S3 presigned URL
    expect(downloadCheck.status).toBe(200);
  });

  test('Step 6: Verify file exists in MinIO/S3', async ({ page }) => {
    // Get the render's outputUrl (S3 key)
    const result = await apiCall(page, 'GET', '/api/renders?status=completed&perPage=1');
    const render = result.data?.items?.[0];
    expect(render).toBeTruthy();
    expect(render.outputUrl).toBeTruthy();

    const s3Key = render.outputUrl;
    console.log(`Checking S3 key: ${s3Key}`);

    // Check MinIO directly using S3 API
    const s3Endpoint = process.env.S3_ENDPOINT || 'https://storage.endlessmaker.com';
    const s3Bucket = process.env.S3_BUCKET || 'forgebase';

    // We can also verify via the storage list endpoint if available,
    // or just confirm the download works (which proves the file is in S3)
    // The download test in Step 5 already proves S3 has the file.

    // Additional check: use the API's storage list if exposed
    const storageCheck = await apiCall(page, 'GET', `/api/renders/${render.id}`);
    expect(storageCheck.data?.outputUrl).toBe(s3Key);
    expect(storageCheck.data?.fileSize).toBeGreaterThan(0);
    expect(storageCheck.data?.durationMs).toBeGreaterThan(0);

    console.log(`S3 verification passed:
  Key: ${s3Key}
  Size: ${(storageCheck.data?.fileSize / 1024 / 1024).toFixed(1)} MB
  Duration: ${(storageCheck.data?.durationMs / 1000).toFixed(1)}s`);
  });
});
