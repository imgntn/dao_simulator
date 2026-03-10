import { test, expect } from '@playwright/test';

/**
 * Homepage Tests - Tests for the research-focused landing page
 */
test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('loads successfully with main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
  });

  test('displays research tagline', async ({ page }) => {
    await expect(page.getByText(/DAO Research, Made Actionable/i)).toBeVisible();
  });

  test('has working simulator link', async ({ page }) => {
    const simLink = page.getByRole('link', { name: /Launch Simulator/i });
    await expect(simLink).toBeVisible();
  });

  test('simulator link navigates to simulate page', async ({ page }) => {
    const simLink = page.getByRole('link', { name: /Launch Simulator/i });
    await simLink.click();
    await expect(page).toHaveURL(/\/simulate/);
  });

  test('has proper page title', async ({ page }) => {
    await expect(page).toHaveTitle(/DAO Simulator/i);
  });

  test('displays digital twins section', async ({ page }) => {
    await expect(page.getByText(/Digital Twins/i).first()).toBeVisible();
  });

  test('responsive layout works at different sizes', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
  });
});
