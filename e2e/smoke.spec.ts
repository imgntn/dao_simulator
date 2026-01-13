import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Quick validation that core functionality works
 * These tests should run quickly and verify basic page loads and navigation.
 */
test.describe('Smoke Tests', () => {
  test.describe('Homepage', () => {
    test('loads successfully', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check that the main heading is present
      await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
    });

    test('has dashboard link that navigates correctly', async ({ page }) => {
      await page.goto('/');

      // Click the dashboard link
      const dashboardLink = page.getByRole('link', { name: /Launch Dashboard/i });
      await expect(dashboardLink).toBeVisible();
      await dashboardLink.click();

      // Should navigate to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('displays feature cards', async ({ page }) => {
      await page.goto('/');

      // Check all three feature cards are present
      await expect(page.getByRole('heading', { name: /3D Network Graphs/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Real-time Analytics/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Agent-Based Simulation/i })).toBeVisible();
    });
  });

  test.describe('Dashboard', () => {
    test('loads successfully', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check that the dashboard header is present (DAO name is generated)
      await expect(page.locator('header')).toBeVisible();
    });

    test('shows connection status', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for connection indicator
      await expect(page.getByText(/Connected|Disconnected/i)).toBeVisible({ timeout: 15000 });
    });

    test('has simulation control buttons', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for Start button
      await expect(page.getByRole('button', { name: /Start.*Space/i })).toBeVisible();

      // Check for Stop button
      await expect(page.getByRole('button', { name: /Stop/i })).toBeVisible();

      // Check for Step button
      await expect(page.getByRole('button', { name: /Step \(F\)/i })).toBeVisible();

      // Check for Reset button
      await expect(page.getByRole('button', { name: /Reset/i })).toBeVisible();
    });

    test('has view mode toggle buttons', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.getByRole('button', { name: /Single DAO/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /DAO City/i })).toBeVisible();
    });

    test('has speed selector', async ({ page }) => {
      await page.goto('/dashboard');

      // Speed selector should be present
      const speedSelect = page.locator('select').filter({ hasText: /1x|2x|4x|8x/ });
      await expect(speedSelect).toBeVisible();
    });

    test('has all navigation tabs', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for all 5 tabs
      await expect(page.getByRole('button', { name: /Overview/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /3D View/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Charts/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Strategy/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Reports/i })).toBeVisible();
    });

    test('shows tutorial on first load', async ({ page }) => {
      await page.goto('/dashboard');

      // Tutorial banner should be visible
      await expect(page.getByText(/Quick start/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Skip/i })).toBeVisible();
    });

    test('can skip tutorial', async ({ page }) => {
      await page.goto('/dashboard');

      // Skip the tutorial
      const skipButton = page.getByRole('button', { name: /Skip/i });
      await skipButton.click();

      // Tutorial should be hidden
      await expect(page.getByText(/Quick start/i)).not.toBeVisible();
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

