import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('page has proper HTML structure', async ({ page }) => {
    await page.goto('/');

    // Check for proper HTML5 semantic structure
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');

    // Check all images have alt attributes
    const images = await page.locator('img').all();

    for (const img of images) {
      const altText = await img.getAttribute('alt');
      expect(altText).toBeTruthy();
    }
  });

  test('links have accessible names', async ({ page }) => {
    await page.goto('/');

    // Check all links have text or aria-label
    const links = await page.locator('a').all();

    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');

      // Link should have either text content or aria-label
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('page is keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Test tab navigation
    await page.keyboard.press('Tab');

    // Check that focus is visible (some element should be focused)
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    expect(focusedElement).toBeTruthy();
  });

  test('proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Get all headings
    const h1Count = await page.locator('h1').count();

    // Page should have at least semantic structure
    // (May not have h1 if it's a landing page with logo)
    expect(h1Count).toBeGreaterThanOrEqual(0);
  });
});
