import { test, expect, type Page } from '@playwright/test';

const SIMULATE_URL = '/en/simulate';

/**
 * Accessibility Tests - Tests for a11y compliance on the homepage
 * and the simulator page.
 */

async function gotoAndWaitForInit(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('sim-tutorial-complete', 'true');
  });
  await page.goto(SIMULATE_URL);
  await expect(
    page.getByRole('heading', { name: /Simulation Control/i }),
  ).toBeVisible({ timeout: 60000 });
}

test.describe('Accessibility', () => {
  test.describe('Homepage', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    test('page has proper HTML lang attribute', async ({ page }) => {
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', /en/);
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
        expect(text || ariaLabel).toBeTruthy();
      }
    });

    test('page is keyboard navigable', async ({ page }) => {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      expect(focusedElement).toBeTruthy();
    });

    test('proper heading hierarchy', async ({ page }) => {
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    });

    test('focus is visible on interactive elements', async ({ page }) => {
      await page.keyboard.press('Tab');
      const focusedSelector = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName.toLowerCase();
      });
      expect(['a', 'button', 'input', 'select']).toContain(focusedSelector);
    });
  });

  test.describe('Simulator Page', () => {
    test.beforeEach(async ({ page }) => {
      await gotoAndWaitForInit(page);
    });

    test('page has proper HTML structure', async ({ page }) => {
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', /en/);
    });

    test('buttons have accessible names', async ({ page }) => {
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        expect((text?.trim()) || ariaLabel || title).toBeTruthy();
      }
    });

    test('color contrast - main text is visible', async ({ page }) => {
      const simRoot = page.locator('[data-sim-root]');
      await expect(simRoot).toBeVisible();

      const textColor = await page.evaluate(() => {
        const el = document.querySelector('[data-sim-root]');
        return el ? window.getComputedStyle(el).color : null;
      });
      expect(textColor).toBeTruthy();
    });

    test('interactive elements have focus states', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const hasFocus = await page.evaluate(() => {
        return document.activeElement !== document.body;
      });
      expect(hasFocus).toBe(true);
    });

    test('navigation tabs are keyboard accessible', async ({ page }) => {
      const interactiveTab = page.getByRole('button', { name: 'Interactive' });
      await interactiveTab.focus();
      const isFocused = await interactiveTab.evaluate((el) =>
        document.activeElement === el
      );
      expect(isFocused).toBe(true);
    });

    test('step counter is readable', async ({ page }) => {
      const stepDisplay = page.getByText(/Step \d+/);
      await expect(stepDisplay).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('can navigate homepage to simulator link with keyboard', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await page.keyboard.press('Tab');
      let foundLink = false;
      for (let i = 0; i < 20; i++) {
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.textContent?.includes('Launch Simulator') ||
                 el?.getAttribute('href')?.includes('/simulate');
        });
        if (focused) {
          foundLink = true;
          break;
        }
        await page.keyboard.press('Tab');
      }
      expect(foundLink).toBe(true);
    });

    test('can navigate simulator tabs with keyboard', async ({ page }) => {
      await gotoAndWaitForInit(page);
      const compareTab = page.getByRole('button', { name: 'Compare' });
      await compareTab.focus();
      await page.keyboard.press('Enter');
      await expect(compareTab).toBeVisible();
    });

    test('can operate simulation controls with keyboard', async ({ page }) => {
      await gotoAndWaitForInit(page);

      const stepButton = page.getByRole('button', { name: 'Step' });
      await stepButton.focus();
      await page.keyboard.press('Enter');

      await expect(async () => {
        const text = await page.getByText(/Step \d+/).innerText();
        const step = parseInt(text.match(/Step (\d+)/)?.[1] ?? '0', 10);
        expect(step).toBeGreaterThan(0);
      }).toPass({ timeout: 5000 });
    });
  });

  test.describe('Screen Reader Support', () => {
    test('headings are present', async ({ page }) => {
      await gotoAndWaitForInit(page);
      const headingCount = await page.locator('h1, h2, h3, h4').count();
      expect(headingCount).toBeGreaterThan(0);
    });
  });

  test.describe('Motion and Animation', () => {
    test('page functions with reduced motion preference', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await gotoAndWaitForInit(page);
      await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    });
  });

  test.describe('Touch Targets', () => {
    test('control buttons meet minimum size requirements', async ({ page }) => {
      await gotoAndWaitForInit(page);

      const buttons = [
        page.getByRole('button', { name: 'Play' }),
        page.getByRole('button', { name: 'Step' }),
        page.getByRole('button', { name: 'Reset' }),
      ];

      for (const button of buttons) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(32);
          expect(box.width).toBeGreaterThanOrEqual(32);
        }
      }
    });
  });
});
