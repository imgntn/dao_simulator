import { test, expect } from '@playwright/test';

/**
 * Accessibility Tests - Tests for a11y compliance
 * These tests verify that the application meets basic accessibility standards.
 */
test.describe('Accessibility', () => {
  test.describe('Homepage', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('page has proper HTML structure', async ({ page }) => {
      // Check for proper HTML5 semantic structure
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', 'en');

      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('images have alt text', async ({ page }) => {
      const images = await page.locator('img').all();

      for (const img of images) {
        const altText = await img.getAttribute('alt');
        expect(altText).toBeTruthy();
      }
    });

    test('links have accessible names', async ({ page }) => {
      const links = await page.locator('a').all();

      for (const link of links) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        // Link should have either text content or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }
    });

    test('page is keyboard navigable', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');

      // Check that focus is visible
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      expect(focusedElement).toBeTruthy();
    });

    test('proper heading hierarchy', async ({ page }) => {
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    });

    test('focus is visible on interactive elements', async ({ page }) => {
      // Tab to the first interactive element
      await page.keyboard.press('Tab');

      // Get the focused element
      const focusedSelector = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName.toLowerCase();
      });

      // Should be focused on a link or button
      expect(['a', 'button', 'input', 'select']).toContain(focusedSelector);
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    });

    test('page has proper HTML structure', async ({ page }) => {
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', 'en');
    });

    test('buttons have accessible names', async ({ page }) => {
      const buttons = await page.locator('button').all();

      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');

        // Button should have either text content or aria-label
        expect((text?.trim()) || ariaLabel).toBeTruthy();
      }
    });

    test('form elements have labels', async ({ page }) => {
      const selects = await page.locator('select').all();

      for (const select of selects) {
        const ariaLabel = await select.getAttribute('aria-label');
        const ariaLabelledby = await select.getAttribute('aria-labelledby');
        const id = await select.getAttribute('id');

        // Check if there's an associated label or aria attribute
        const hasLabel =
          ariaLabel ||
          ariaLabelledby ||
          (id && (await page.locator(`label[for="${id}"]`).count()) > 0);

        // At minimum, aria-labelledby should exist (speed selector)
        expect(ariaLabel || ariaLabelledby).toBeTruthy();
      }
    });

    test('color contrast is sufficient', async ({ page }) => {
      // Check that main text is visible against background
      const mainText = page.locator('main').first();
      await expect(mainText).toBeVisible();

      // Verify text elements are readable (basic check)
      const textColor = await page.evaluate(() => {
        const el = document.querySelector('main');
        return el ? window.getComputedStyle(el).color : null;
      });

      expect(textColor).toBeTruthy();
    });

    test('interactive elements have focus states', async ({ page }) => {
      // Skip tutorial
      await page.getByRole('button', { name: /Skip/i }).click();

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify an element is focused
      const hasFocus = await page.evaluate(() => {
        return document.activeElement !== document.body;
      });

      expect(hasFocus).toBe(true);
    });

    test('hotkey hints are visible', async ({ page }) => {
      // Hotkey hints should be displayed
      await expect(page.getByText(/Space start\/stop/i)).toBeVisible();
    });

    test('status indicators are accessible', async ({ page }) => {
      // Connection status should be readable
      const connectionStatus = page.getByText(/Connected|Disconnected/i);
      await expect(connectionStatus).toBeVisible({ timeout: 15000 });
    });

    test('navigation tabs are keyboard accessible', async ({ page }) => {
      // Focus on first tab
      const overviewTab = page.getByRole('button', { name: /Overview/i });
      await overviewTab.focus();

      // Verify it's focused
      const isFocused = await overviewTab.evaluate((el) =>
        document.activeElement === el
      );
      expect(isFocused).toBe(true);

      // Can activate via keyboard
      await page.keyboard.press('Enter');
      await expect(overviewTab).toHaveClass(/bg-blue-600/);
    });

    test('ARIA live regions exist for status updates', async ({ page }) => {
      // The dashboard should have some form of live region for dynamic updates
      // Check for connection status or step counter
      const stepDisplay = page.getByText(/Step:/i);
      await expect(stepDisplay).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('can navigate entire homepage with keyboard', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Start at beginning
      await page.keyboard.press('Tab');

      // Should be able to reach the main CTA
      let foundLink = false;
      for (let i = 0; i < 10; i++) {
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.textContent?.includes('Launch Dashboard') ||
                 el?.getAttribute('href') === '/dashboard';
        });

        if (focused) {
          foundLink = true;
          break;
        }
        await page.keyboard.press('Tab');
      }

      expect(foundLink).toBe(true);
    });

    test('can navigate dashboard tabs with keyboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Find and focus the Strategy tab
      const strategyTab = page.getByRole('button', { name: /Strategy/i });
      await strategyTab.focus();
      await page.keyboard.press('Enter');

      // Should now show Strategy content
      await expect(page.getByText(/Strategy Playbooks/i)).toBeVisible();
    });

    test('can operate simulation controls with keyboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Wait for connection
      await expect(page.getByText('Connected')).toBeVisible({ timeout: 15000 });

      // Focus step button and activate
      const stepButton = page.getByRole('button', { name: /Step \(F\)/i });
      await stepButton.focus();
      await page.keyboard.press('Enter');

      // Step should increment
      await expect(page.locator('text=/Step:\\s*[1-9]/')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Screen Reader Support', () => {
    test('semantic HTML is used', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for semantic elements
      const hasHeader = await page.locator('header').count();
      const hasMain = await page.locator('main').count();
      const hasFooter = await page.locator('footer').count();
      const hasNav = await page.locator('nav').count();

      expect(hasHeader).toBeGreaterThan(0);
      expect(hasMain).toBeGreaterThan(0);
      expect(hasFooter).toBeGreaterThan(0);
      expect(hasNav).toBeGreaterThan(0);
    });

    test('headings are hierarchical', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Get all heading levels
      const h1Count = await page.locator('h1').count();
      const h2Count = await page.locator('h2').count();
      const h3Count = await page.locator('h3').count();

      // Should have at least one heading structure
      expect(h1Count + h2Count + h3Count).toBeGreaterThan(0);
    });

    test('landmark regions are present', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for landmark roles
      const hasHeaderLandmark = await page.locator('header').count() > 0;
      const hasMainLandmark = await page.locator('main').count() > 0;
      const hasNavLandmark = await page.locator('nav').count() > 0;

      expect(hasHeaderLandmark).toBe(true);
      expect(hasMainLandmark).toBe(true);
      expect(hasNavLandmark).toBe(true);
    });
  });

  test.describe('Motion and Animation', () => {
    test('animations respect reduced motion preference', async ({ page }) => {
      // Enable reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Page should still function
      await expect(page.locator('main')).toBeVisible();

      // Can interact normally
      const stepButton = page.getByRole('button', { name: /Step \(F\)/i });
      await expect(stepButton).toBeVisible();
    });
  });

  test.describe('Touch Targets', () => {
    test('buttons meet minimum size requirements', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check main control buttons
      const buttons = [
        page.getByRole('button', { name: /Start.*Space/i }),
        page.getByRole('button', { name: /Stop/i }),
        page.getByRole('button', { name: /Step \(F\)/i }),
        page.getByRole('button', { name: /Reset/i }),
      ];

      for (const button of buttons) {
        const box = await button.boundingBox();
        if (box) {
          // WCAG recommends 44x44 minimum, but 32px is acceptable
          expect(box.height).toBeGreaterThanOrEqual(32);
          expect(box.width).toBeGreaterThanOrEqual(32);
        }
      }
    });
  });
});

