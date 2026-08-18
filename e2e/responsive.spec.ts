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
    await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible();
  });

  test('primary navigation and analysis menu are visible', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Explore · Sanctum' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Evidence' })).toBeVisible();
    await expect(page.getByText(/^Analysis tools/)).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Start simulation', exact: true })).toBeVisible();
  });

  test('tablet uses the compact dashboard at handheld width', async ({ page }) => {
    await expect(page.getByText('For the full Sanctum scene, open on desktop')).toBeVisible();
  });

  test('desktop canvas is omitted at handheld width', async ({ page }) => {
    await expect(page.locator('canvas')).toHaveCount(0);
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

  test('mobile uses the compact dashboard instead of the desktop scene', async ({ page }) => {
    await expect(page.getByText('For the full Sanctum scene, open on desktop')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('controls are accessible on mobile', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Start simulation', exact: true })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Start simulation', exact: true })).toBeVisible();

    await page.setViewportSize({ width: 812, height: 375 });
    await expect(page.getByRole('button', { name: 'Start simulation', exact: true })).toBeVisible();
  });
});

test.describe('Touch Interactions', () => {
  test('buttons are touch-friendly size', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoAndWaitForInit(page);

    const playButton = page.getByRole('button', { name: 'Start simulation', exact: true });
    const buttonBox = await playButton.boundingBox();
    if (buttonBox) {
      expect(buttonBox.height).toBeGreaterThanOrEqual(32);
      expect(buttonBox.width).toBeGreaterThanOrEqual(32);
    }
  });

  test('primary control remains touch-friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoAndWaitForInit(page);

    const stepButton = page.getByRole('button', { name: 'Advance simulation' });
    const controlBox = await stepButton.boundingBox();
    if (controlBox) {
      expect(controlBox.height).toBeGreaterThanOrEqual(32);
    }
  });
});
