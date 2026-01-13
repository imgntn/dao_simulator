import { test, expect } from '@playwright/test';

/**
 * Responsive Layout Tests - Tests for different viewport sizes
 * These tests verify the UI adapts properly to mobile, tablet, and desktop viewports.
 */

test.describe('Desktop Layout (1280x720)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('header shows all control buttons', async ({ page }) => {
    // All buttons should be visible in desktop
    await expect(page.getByRole('button', { name: /Start.*Space/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Stop/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Step \(F\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reset/i })).toBeVisible();
  });

  test('navigation tabs are fully visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Overview/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /3D View/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Charts/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Strategy/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reports/i })).toBeVisible();
  });

  test('footer shows three-column layout', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const footer = page.locator('footer');
    await expect(footer.getByText(/DAO Simulator/i)).toBeVisible();
    await expect(footer.getByText(/Next\.js/i)).toBeVisible();
    await expect(footer.getByText(/Built with vision/i)).toBeVisible();
  });

  test('Strategy tab shows preset grid in columns', async ({ page }) => {
    await page.getByRole('button', { name: /Strategy/i }).click();

    // All presets should be visible
    await expect(page.getByRole('button', { name: /Balanced/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Validator-First/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Growth Push/i })).toBeVisible();
  });
});

test.describe('Wide Desktop Layout (1920x1080)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('main content uses full width', async ({ page }) => {
    const main = page.locator('main');
    const mainBox = await main.boundingBox();
    expect(mainBox?.width).toBeGreaterThan(1400);
  });

  test('grid layouts expand properly', async ({ page }) => {
    // Skip tutorial to see content
    await page.getByRole('button', { name: /Skip/i }).click();

    // Missions and token sections should be side by side
    const missionSection = page.locator('#section-missions');
    const tokenSection = page.locator('#section-token');

    const missionBox = await missionSection.boundingBox();
    const tokenBox = await tokenSection.boundingBox();

    // They should be on the same row (similar Y position)
    if (missionBox && tokenBox) {
      expect(Math.abs((missionBox.y || 0) - (tokenBox.y || 0))).toBeLessThan(50);
    }
  });
});

test.describe('Tablet Layout (768x1024)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('page loads correctly on tablet', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('control buttons are accessible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Start.*Space/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Stop/i })).toBeVisible();
  });

  test('tabs remain functional', async ({ page }) => {
    await page.getByRole('button', { name: /Strategy/i }).click();
    await expect(page.getByText(/Strategy Playbooks/i)).toBeVisible();
  });
});

test.describe('Mobile Layout (375x667)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('page loads correctly on mobile', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('can scroll to see all content', async ({ page }) => {
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer.getByText(/Built with vision/i)).toBeVisible();
  });

  test('control buttons exist on mobile', async ({ page }) => {
    // Main controls should still be accessible
    await expect(page.getByRole('button', { name: /Start.*Space/i })).toBeVisible();
  });

  test('tabs wrap or scroll on mobile', async ({ page }) => {
    // At least some tabs should be visible
    const overviewTab = page.getByRole('button', { name: /Overview/i });
    await expect(overviewTab).toBeVisible();

    // Can click to other tabs
    await page.getByRole('button', { name: /Strategy/i }).click();
    await expect(page.getByText(/Strategy Playbooks/i)).toBeVisible();
  });

  test('tutorial is visible and functional on mobile', async ({ page }) => {
    // Tutorial should be visible
    await expect(page.getByText(/Quick start/i)).toBeVisible();

    // Can skip on mobile
    await page.getByRole('button', { name: /Skip/i }).click();
    await expect(page.getByText(/Quick start/i)).not.toBeVisible();
  });
});

test.describe('Small Mobile Layout (320x568)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('page loads on small mobile', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
  });

  test('no horizontal overflow', async ({ page }) => {
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    // Should not have horizontal overflow
    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe('Homepage Responsive', () => {
  test('homepage is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Launch Dashboard/i })).toBeVisible();
  });

  test('homepage is responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Launch Dashboard/i })).toBeVisible();
  });

  test('feature cards stack on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // All feature cards should be accessible via scrolling
    await expect(page.getByRole('heading', { name: /3D Network Graphs/i })).toBeVisible();

    // Scroll to see other cards
    await page.evaluate(() => window.scrollBy(0, 300));
    await expect(page.getByRole('heading', { name: /Real-time Analytics/i })).toBeVisible();
  });
});

test.describe('Orientation Changes', () => {
  test('handles portrait to landscape change', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main')).toBeVisible();

    // Switch to landscape
    await page.setViewportSize({ width: 812, height: 375 });

    // Content should still be accessible
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('button', { name: /Start.*Space/i })).toBeVisible();
  });
});

test.describe('Touch Interactions', () => {
  test('buttons are touch-friendly size', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Start button should have minimum touch target size (44x44 recommended)
    const startButton = page.getByRole('button', { name: /Start.*Space/i });
    const buttonBox = await startButton.boundingBox();

    if (buttonBox) {
      expect(buttonBox.height).toBeGreaterThanOrEqual(40);
      expect(buttonBox.width).toBeGreaterThanOrEqual(40);
    }
  });

  test('tabs are touch-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const overviewTab = page.getByRole('button', { name: /Overview/i });
    const tabBox = await overviewTab.boundingBox();

    if (tabBox) {
      expect(tabBox.height).toBeGreaterThanOrEqual(32);
    }
  });
});

test.describe('Content Readability', () => {
  test('text is readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check that main headings are properly sized
    const heading = page.locator('h1').first();
    const fontSize = await heading.evaluate(el =>
      window.getComputedStyle(el).fontSize
    );

    // Should be at least 20px for mobile readability
    const fontSizeValue = parseInt(fontSize, 10);
    expect(fontSizeValue).toBeGreaterThanOrEqual(20);
  });
});

