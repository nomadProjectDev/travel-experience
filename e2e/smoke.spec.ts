import { test, expect } from '@playwright/test';

/** 1×1 PNG — enough for framing + studio shell assertions without Gemini. */
const MOCK_IMAGE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z5BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function stubCamera(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const stream = canvas.captureStream(30);
    navigator.mediaDevices.getUserMedia = async () => stream;
  });
}

async function mockGenerateApi(page: import('@playwright/test').Page) {
  await page.route('**/api/generate', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ image: MOCK_IMAGE_DATA_URL }),
    });
  });
}

test.describe('web-try-on smoke', () => {
  test('eyewear PDP renders with Probador virtual CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /probador virtual/i })).toBeVisible();
  });

  test('api rejects unauthenticated generate when API_KEY is set', async ({ request }) => {
    const res = await request.post('/api/generate', {
      data: { parts: [{ text: 'ping' }] },
    });
    expect(res.status()).toBe(401);
  });

  test('studio shell after mocked capture and generate', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    await stubCamera(page);
    await mockGenerateApi(page);
    await page.goto('/');

    await page.getByRole('button', { name: /probador virtual/i }).click();
    await expect(page.getByRole('button', { name: 'Capture portrait' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: 'Set no timer' }).click();
    await page.getByRole('button', { name: 'Capture portrait' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByRole('button', { name: /Continuar/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: /Recapturar|Recapture/i })).toBeVisible();
  });
});
