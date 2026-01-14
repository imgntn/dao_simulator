import { test, expect } from '@playwright/test';
import { m, toRegex, buttons, tabs, status } from './utils/i18n-helpers';

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
      await expect(page.getByRole('heading', { name: toRegex(m.home.title) })).toBeVisible();
    });

    test('has dashboard link that navigates correctly', async ({ page }) => {
      await page.goto('/');

      // Click the dashboard link
      const dashboardLink = page.getByRole('link', { name: toRegex(m.home.launchDashboard) });
      await expect(dashboardLink).toBeVisible();
      await dashboardLink.click();

      // Should navigate to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('displays feature cards', async ({ page }) => {
      await page.goto('/');

      // Check all three feature cards are present
      await expect(page.getByRole('heading', { name: toRegex(m.home.feature3dTitle) })).toBeVisible();
      await expect(page.getByRole('heading', { name: toRegex(m.home.featureLiveTitle) })).toBeVisible();
      await expect(page.getByRole('heading', { name: toRegex(m.home.featureAgentsTitle) })).toBeVisible();
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

      // Wait for connection indicator (using i18n status patterns)
      const connectedOrDisconnected = new RegExp(`${m.common.connected}|${m.common.disconnected}`, 'i');
      await expect(page.getByText(connectedOrDisconnected)).toBeVisible({ timeout: 15000 });
    });

    test('has simulation control buttons', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for Start button
      await expect(page.getByRole('button', { name: buttons.start })).toBeVisible();

      // Check for Stop button
      await expect(page.getByRole('button', { name: buttons.stop })).toBeVisible();

      // Check for Step button
      await expect(page.getByRole('button', { name: buttons.step })).toBeVisible();

      // Check for Reset button
      await expect(page.getByRole('button', { name: buttons.reset })).toBeVisible();
    });

    test('has view mode toggle buttons', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.getByRole('button', { name: toRegex(m.controls.singleDao) })).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(m.controls.daoCity) })).toBeVisible();
    });

    test('has speed selector', async ({ page }) => {
      await page.goto('/dashboard');

      // Speed selector should be present
      const speedSelect = page.locator('select').filter({ hasText: /1x|2x|4x|8x/ });
      await expect(speedSelect).toBeVisible();
    });

    test('has all navigation tabs', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for all 5 tabs using i18n strings
      await expect(page.getByRole('button', { name: toRegex(tabs.overview) })).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(tabs.view3d) })).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(tabs.charts) })).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(tabs.strategy) })).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(tabs.reports) })).toBeVisible();
    });

    test('shows tutorial on first load', async ({ page }) => {
      await page.goto('/dashboard');

      // Tutorial banner should be visible
      await expect(page.getByText(toRegex(m.tutorial.title))).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(m.common.skip) })).toBeVisible();
    });

    test('can skip tutorial', async ({ page }) => {
      await page.goto('/dashboard');

      // Skip the tutorial
      const skipButton = page.getByRole('button', { name: toRegex(m.common.skip) });
      await skipButton.click();

      // Tutorial should be hidden
      await expect(page.getByText(toRegex(m.tutorial.title))).not.toBeVisible();
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

