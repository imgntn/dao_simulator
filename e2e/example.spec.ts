import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the main heading is present
    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
  });

  test('displays main title', async ({ page }) => {
    await page.goto('/');

    // Check for DAO Simulator title
    const title = page.getByRole('heading', { name: /DAO Simulator/i });
    await expect(title).toBeVisible();
  });

  test('displays main content elements', async ({ page }) => {
    await page.goto('/');

    // Check for the descriptive text
    await expect(page.getByText(/Real-time decentralized governance visualization/i)).toBeVisible();
    await expect(page.getByText(/Experience the beauty of distributed decision-making/i)).toBeVisible();
  });

  test('has working dashboard link', async ({ page }) => {
    await page.goto('/');

    // Check that dashboard link exists
    const dashboardLink = page.getByRole('link', { name: /Launch Dashboard/i });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  test('feature cards are present', async ({ page }) => {
    await page.goto('/');

    // Check feature cards
    await expect(page.getByRole('heading', { name: /3D Network Graphs/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Real-time Analytics/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Agent-Based Simulation/i })).toBeVisible();
  });

  test('responsive layout works', async ({ page }) => {
    await page.goto('/');

    // Test desktop layout
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('main')).toBeVisible();

    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('main')).toBeVisible();
  });
});
