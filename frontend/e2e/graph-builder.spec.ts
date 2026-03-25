import { test, expect } from '@playwright/test';

// Mock the backend API so tests don't need a real server
test.beforeEach(async ({ page }) => {
  // Mock GET /api/graph/ → empty topology
  await page.route('**/api/graph/', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sites: [], nodes: [], edges: [] }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  // Mock POST /api/graph/
  await page.route('**/api/graph/', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  // Mock /api/analysis/history
  await page.route('**/api/analysis/history', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/');
});

test.describe('Graph Builder', () => {
  test('renders the Graph Builder page with canvas', async ({ page }) => {
    await expect(page.locator('text=Graph Builder')).toBeVisible();
    // The ReactFlow canvas should be present
    await expect(page.locator('.react-flow')).toBeVisible();
  });

  test('node palette is visible on the left', async ({ page }) => {
    await expect(page.locator('text=Nodos de Red')).toBeVisible();
    await expect(page.locator('text=Core Interno')).toBeVisible();
    await expect(page.locator('text=Core Externo')).toBeVisible();
    await expect(page.locator('text=Aviat CTR')).toBeVisible();
  });

  test('Guardar button is present in the toolbar', async ({ page }) => {
    await expect(page.locator('button:has-text("Guardar")')).toBeVisible();
  });

  test('Validar button is present in the toolbar', async ({ page }) => {
    await expect(page.locator('button:has-text("Validar")')).toBeVisible();
  });

  test('PropertiesPanel shows placeholder when nothing selected', async ({ page }) => {
    await expect(page.locator('text=Selecciona un nodo')).toBeVisible();
  });

  test('clicking Validar opens the ValidationModal', async ({ page }) => {
    await page.locator('button:has-text("Validar")').click();
    await expect(page.locator('text=reglas')).toBeVisible({ timeout: 3000 });
  });
});
