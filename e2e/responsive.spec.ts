import { test, expect, type Page } from '@playwright/test';

const SIMULATE_URL = '/en/simulate';

/**
 * Responsive Layout Tests - Tests that the simulator adapts to
 * different viewport sizes (desktop, tablet, mobile).
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

async function getStep(page: Page): Promise<number> {
  const text = await page.getByText(/Step \d+/).innerText();
  const match = text.match(/Step (\d+)/);
  return match ? parseInt(match[1], 10) : -1;
}

async function playAndWaitForSteps(page: Page, minSteps = 3) {
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(async () => {
    const step = await getStep(page);
    expect(step).toBeGreaterThanOrEqual(minSteps);
  }).toPass({ timeout: 30000 });
  await page.getByRole('button', { name: 'Pause' }).last().click();
}

test.describe('Desktop Layout (1280x720)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await gotoAndWaitForInit(page);
  });

  test('shows all transport controls', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Step' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  });

  test('all tabs are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Interactive' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compare' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Branch' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Multi-Run' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Research' })).toBeVisible();
  });

  test('control panel is visible in sidebar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Simulation Control/i })).toBeVisible();
    await expect(page.getByText(/steps\/sec/)).toBeVisible();
  });

  test('3D canvas has proper dimensions', async ({ page }) => {
    // Play steps so the 3D canvas is mounted
    await playAndWaitForSteps(page, 3);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(500);
    expect(box!.height).toBeGreaterThan(300);
  });
});

test.describe('Wide Desktop Layout (1920x1080)', () => {
  test('content expands at wide viewports', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 3);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box!.width).toBeGreaterThan(1000);
  });
});

test.describe('Tablet Layout (768x1024)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await gotoAndWaitForInit(page);
  });

  test('page loads correctly on tablet', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });

  test('tabs are accessible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Interactive' })).toBeVisible();
  });

  test('canvas renders', async ({ page }) => {
    await playAndWaitForSteps(page, 3);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });
});

test.describe('Mobile Layout (375x667)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoAndWaitForInit(page);
  });

  test('page loads on mobile', async ({ page }) => {
    await expect(page.locator('[data-sim-root]')).toBeVisible();
  });

  test('canvas renders on mobile', async ({ page }) => {
    // On mobile the step counter may not be visible, so just click Play and wait
    await page.getByRole('button', { name: 'Play' }).click();
    await page.waitForTimeout(3000);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });

  test('controls are accessible on mobile', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });
});

test.describe('Small Mobile Layout (320x568)', () => {
  test('page loads on small mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await gotoAndWaitForInit(page);
    await expect(page.locator('[data-sim-root]')).toBeVisible();
  });

  test('no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await gotoAndWaitForInit(page);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe('Homepage Responsive', () => {
  test('homepage is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
  });

  test('homepage is responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
  });
});

test.describe('Orientation Changes', () => {
  test('handles portrait to landscape change', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoAndWaitForInit(page);
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();

    await page.setViewportSize({ width: 812, height: 375 });
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });
});

test.describe('Touch Interactions', () => {
  test('buttons are touch-friendly size', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoAndWaitForInit(page);

    const playButton = page.getByRole('button', { name: 'Play' });
    const buttonBox = await playButton.boundingBox();
    if (buttonBox) {
      expect(buttonBox.height).toBeGreaterThanOrEqual(32);
      expect(buttonBox.width).toBeGreaterThanOrEqual(32);
    }
  });

  test('tabs are touch-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoAndWaitForInit(page);

    const interactiveTab = page.getByRole('button', { name: 'Interactive' });
    const tabBox = await interactiveTab.boundingBox();
    if (tabBox) {
      expect(tabBox.height).toBeGreaterThanOrEqual(28);
    }
  });
});
