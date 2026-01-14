import { test, expect } from '@playwright/test';

/**
 * Homepage Tests - Tests for the landing page
 */
test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('loads successfully with main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
  });

  test('displays hero content', async ({ page }) => {
    await expect(page.getByText(/Real-time decentralized governance visualization/i)).toBeVisible();
    await expect(page.getByText(/Experience the beauty of distributed decision-making/i)).toBeVisible();
  });

  test('has working dashboard link', async ({ page }) => {
    const dashboardLink = page.getByRole('link', { name: /Launch Dashboard/i });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  test('feature cards are present and complete', async ({ page }) => {
    // Check all three feature cards
    await expect(page.getByRole('heading', { name: /3D Network Graphs/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Real-time Analytics/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Agent-Based Simulation/i })).toBeVisible();

    // Check feature descriptions exist
    await expect(page.getByText(/interactive (charts|visualizations)/i)).toBeVisible();
  });

  test('responsive layout works at different sizes', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();

    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
  });

  test('dashboard link navigates correctly', async ({ page }) => {
    const dashboardLink = page.getByRole('link', { name: /Launch Dashboard/i });
    await dashboardLink.click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('has proper meta content', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/DAO Simulator/i);
  });

  test('gradient animation is present', async ({ page }) => {
    // The hero section should have gradient styling
    const heroText = page.getByRole('heading', { name: /DAO Simulator/i });
    await expect(heroText).toBeVisible();

    // Check for gradient class
    await expect(heroText).toHaveClass(/bg-gradient/);
  });
});

