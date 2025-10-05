import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is present
    await expect(page).toHaveTitle(/Create Next App/i);
  });

  test('displays Next.js logo', async ({ page }) => {
    await page.goto('/');

    // Check for Next.js logo
    const logo = page.locator('img[alt="Next.js logo"]');
    await expect(logo).toBeVisible();
  });

  test('displays main content elements', async ({ page }) => {
    await page.goto('/');

    // Check for the instructional text
    await expect(page.getByText('Get started by editing')).toBeVisible();
    await expect(page.getByText('app/page.tsx')).toBeVisible();
  });

  test('has working external links', async ({ page }) => {
    await page.goto('/');

    // Check that external links exist and have proper attributes
    const deployLink = page.getByRole('link', { name: /Deploy now/i });
    await expect(deployLink).toBeVisible();
    await expect(deployLink).toHaveAttribute('target', '_blank');
    await expect(deployLink).toHaveAttribute('rel', 'noopener noreferrer');

    const docsLink = page.getByRole('link', { name: /Read our docs/i });
    await expect(docsLink).toBeVisible();
    await expect(docsLink).toHaveAttribute('target', '_blank');
  });

  test('footer links are present', async ({ page }) => {
    await page.goto('/');

    // Check footer links
    await expect(page.getByRole('link', { name: /Learn/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Examples/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Go to nextjs.org/i })).toBeVisible();
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
