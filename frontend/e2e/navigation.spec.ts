import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock all API calls
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/ws/**', async (route) => {
    await route.abort();
  });
});

test.describe('Navigation', () => {
  test('loads the home page (Graph Builder)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NetAI/i);
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('TopBar shows all 3 navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a:has-text("Graph Builder")')).toBeVisible();
    await expect(page.locator('a:has-text("AI Reasoning")')).toBeVisible();
    await expect(page.locator('a:has-text("Insights")')).toBeVisible();
  });

  test('navigates to AI Reasoning page', async ({ page }) => {
    await page.goto('/');
    await page.locator('a:has-text("AI Reasoning")').click();
    await expect(page).toHaveURL(/reasoning/);
    await expect(page.locator('text=Agentes')).toBeVisible();
  });

  test('navigates to Insights page', async ({ page }) => {
    await page.goto('/');
    await page.locator('a:has-text("Insights")').click();
    await expect(page).toHaveURL(/insights/);
  });

  test('TopBar shows NetAI Studio brand', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=NetAI Studio')).toBeVisible();
  });

  test('Run Analysis button is always visible in TopBar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button:has-text("Run Analysis")')).toBeVisible();
    await page.locator('a:has-text("AI Reasoning")').click();
    await expect(page.locator('button:has-text("Run Analysis")')).toBeVisible();
  });
});
