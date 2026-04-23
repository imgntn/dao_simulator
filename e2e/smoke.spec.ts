import { test, expect, type Page } from '@playwright/test';

const SIMULATE_URL = '/en/simulate';

async function prepareSimulator(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('sim-tutorial-complete', 'true');
  });
}

/**
 * Smoke Tests - Quick validation that core functionality works.
 * These tests run fast and verify basic page loads and navigation.
 */
test.describe('Smoke Tests', () => {
  test.describe('Homepage', () => {
    test('loads successfully', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
    });

    test('has simulator link', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const simLink = page.getByRole('link', { name: /Launch Simulator|Enter the Sanctum/i }).first();
      await expect(simLink).toBeVisible();
    });
  });

  test.describe('Simulator', () => {
    test('loads and initializes', async ({ page }) => {
      await prepareSimulator(page);
      await page.goto(SIMULATE_URL, { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('heading', { name: /Simulation Control/i }),
      ).toBeVisible({ timeout: 60000 });
    });

    test('has transport controls', async ({ page }) => {
      await prepareSimulator(page);
      await page.goto(SIMULATE_URL, { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('heading', { name: /Simulation Control/i }),
      ).toBeVisible({ timeout: 60000 });

      await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Step' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
    });

    test('shows step counter at zero', async ({ page }) => {
      await prepareSimulator(page);
      await page.goto(SIMULATE_URL, { waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('heading', { name: /Simulation Control/i }),
      ).toBeVisible({ timeout: 60000 });

      await expect(page.getByText(/Step \d+/)).toBeVisible();
    });
  });

  test.describe('API Endpoints', () => {
    test('simulation API responds', async ({ request }) => {
      const response = await request.get('/api/simulation');
      expect(response.status()).toBeLessThan(500);
    });

    test('simulation data API responds', async ({ request }) => {
      const response = await request.get('/api/simulation/data');
      expect(response.status()).toBeLessThan(500);
    });
  });
});
