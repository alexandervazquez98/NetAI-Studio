import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/analysis/history', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'abc-123', created_at: new Date().toISOString(), status: 'done', summary: 'Red estable.', alert_count: 1 }
      ]),
    });
  });
  await page.route('**/api/chat/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'La red está operando normalmente.' }),
    });
  });
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.goto('/insights');
});

test.describe('Insights & Chat', () => {
  test('renders the Insights page', async ({ page }) => {
    await expect(page.locator('text=Alertas')).toBeVisible();
  });

  test('ChatBox input is present', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Pregunta"]').or(page.locator('textarea'))).toBeVisible();
  });

  test('user can type a chat message', async ({ page }) => {
    const input = page.locator('input[placeholder*="Pregunta"]').or(page.locator('textarea')).first();
    await input.fill('¿Cómo está la red?');
    await expect(input).toHaveValue('¿Cómo está la red?');
  });

  test('chat message is sent and response appears', async ({ page }) => {
    const input = page.locator('input[placeholder*="Pregunta"]').or(page.locator('textarea')).first();
    await input.fill('¿Cómo está la red?');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=La red está operando normalmente.')).toBeVisible({ timeout: 5000 });
  });
});
