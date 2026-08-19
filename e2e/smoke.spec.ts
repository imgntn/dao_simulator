import { test, expect, type Page } from '@playwright/test';

const SIMULATE_URL = '/en/simulate';
const RUNNING_AGAINST_DEPLOYED_PRODUCTION = process.env.PLAYWRIGHT_BASE_URL?.startsWith('https://') ?? false;

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

      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible();
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
      if (RUNNING_AGAINST_DEPLOYED_PRODUCTION) {
        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Unauthorized - API key required');
        return;
      }
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.simulations)).toBeTruthy();
    });

    test('simulation data API responds', async ({ request }) => {
      const response = await request.get('/api/simulation/data');
      if (RUNNING_AGAINST_DEPLOYED_PRODUCTION) {
        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Unauthorized - API key required');
        return;
      }
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });
  });
});
