import { test, expect, type Page } from '@playwright/test';

const SIMULATE_URL = '/en/simulate';

/**
 * Helper: Navigate to simulate page and wait for initialization to complete.
 * The page fetches calibration data then boots a Web Worker, so we wait
 * for the "Simulation Control" heading which only appears after init.
 */
async function gotoAndWaitForInit(page: Page) {
  await page.goto(SIMULATE_URL);
  await expect(
    page.getByRole('heading', { name: /Simulation Control/i }),
  ).toBeVisible({ timeout: 60000 });
}

/** Parse the step number from the "Step N" text. */
async function getStep(page: Page): Promise<number> {
  const text = await page.getByText(/Step \d+/).innerText();
  const match = text.match(/Step (\d+)/);
  return match ? parseInt(match[1], 10) : -1;
}

/** Click Play button and wait for steps to start advancing. */
async function playAndWaitForSteps(page: Page, minSteps = 5) {
  await page.getByRole('button', { name: 'Play' }).click();
  // Wait until step counter reaches at least minSteps
  await expect(async () => {
    const step = await getStep(page);
    expect(step).toBeGreaterThanOrEqual(minSteps);
  }).toPass({ timeout: 30000 });
}

// ---------------------------------------------------------------------------
// Page Load & Initialization
// ---------------------------------------------------------------------------
test.describe('Simulate Page - Load & Initialization', () => {
  test('shows initializing state while loading', async ({ page }) => {
    await page.goto(SIMULATE_URL);
    // The loading text should appear before init completes
    await expect(
      page.getByText('Initializing simulation engine...'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('initialization completes and shows control panel', async ({ page }) => {
    await gotoAndWaitForInit(page);

    await expect(page.getByRole('heading', { name: /Simulation Control/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Step' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  });

  test('DAO preset dropdown is populated with 14 DAOs', async ({ page }) => {
    await gotoAndWaitForInit(page);

    const daoSelect = page.locator('select').first();
    const options = daoSelect.locator('option');
    await expect(options).toHaveCount(14);

    // Spot-check a few DAO names
    await expect(daoSelect).toContainText('Aave');
    await expect(daoSelect).toContainText('Uniswap');
    await expect(daoSelect).toContainText('Gitcoin');
  });

  test('governance rule dropdown has options', async ({ page }) => {
    await gotoAndWaitForInit(page);

    const govSelect = page.locator('select').nth(1);
    const options = govSelect.locator('option');
    // 8 options: Default + 7 rules
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(7);

    await expect(govSelect).toContainText('Simple Majority');
    await expect(govSelect).toContainText('Quadratic Voting');
  });
});

// ---------------------------------------------------------------------------
// Simulation Controls
// ---------------------------------------------------------------------------
test.describe('Simulate Page - Controls', () => {
  test('Play button starts simulation and step counter increments', async ({ page }) => {
    await gotoAndWaitForInit(page);

    const initialStep = await getStep(page);
    expect(initialStep).toBe(0);

    await playAndWaitForSteps(page, 3);

    const newStep = await getStep(page);
    expect(newStep).toBeGreaterThan(0);
  });

  test('Pause button stops the step counter', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 5);

    // Click Pause
    await page.getByRole('button', { name: 'Pause' }).click();

    // Record current step, wait a bit, confirm it hasn't advanced
    const steppedAt = await getStep(page);
    await page.waitForTimeout(1500);
    const steppedAfter = await getStep(page);
    // Allow at most 1 step of drift (in-flight step)
    expect(steppedAfter - steppedAt).toBeLessThanOrEqual(1);
  });

  test('Step button advances exactly one step when paused', async ({ page }) => {
    await gotoAndWaitForInit(page);

    const before = await getStep(page);
    await page.getByRole('button', { name: 'Step' }).click();
    // Wait for step to register
    await expect(async () => {
      const after = await getStep(page);
      expect(after).toBe(before + 1);
    }).toPass({ timeout: 5000 });
  });

  test('Reset button resets step counter to 0', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 5);

    // Pause first, then reset
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('button', { name: 'Reset' }).click();

    await expect(async () => {
      const step = await getStep(page);
      expect(step).toBe(0);
    }).toPass({ timeout: 10000 });
  });

  test('Speed slider accepts new values', async ({ page }) => {
    await gotoAndWaitForInit(page);

    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    // Set slider to a specific value
    await slider.fill('30');
    await expect(page.getByText('30 steps/sec')).toBeVisible();
  });

  test('Play/Pause button text toggles', async ({ page }) => {
    await gotoAndWaitForInit(page);

    // Initially shows Play
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();

    // Click Play -> should now show Pause
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();

    // Click Pause -> should now show Play
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Dashboard & Charts
// ---------------------------------------------------------------------------
test.describe('Simulate Page - Dashboard & Charts', () => {
  test('metric cards appear after simulation runs', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 5);
    await page.getByRole('button', { name: 'Pause' }).click();

    // Metric card labels are <div> elements; chart titles are <h3> elements.
    // Scope to div to avoid strict-mode violations from duplicate text.
    const metricLabel = (text: string) =>
      page.locator('div').filter({ hasText: new RegExp(`^${text}$`) });
    await expect(metricLabel('Treasury')).toBeVisible();
    await expect(metricLabel('Token Price')).toBeVisible();
    await expect(metricLabel('Members')).toBeVisible();
    await expect(metricLabel('Proposals')).toBeVisible();
    await expect(metricLabel('Gini')).toBeVisible();
    await expect(metricLabel('Participation')).toBeVisible();
  });

  test('Recharts SVG elements render after steps', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 15);
    await page.getByRole('button', { name: 'Pause' }).click();

    // Recharts renders SVG elements with class recharts-surface
    const charts = page.locator('.recharts-surface');
    await expect(async () => {
      const count = await charts.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10000 });
  });

  test('agent distribution chart shows at least one agent type', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 5);
    await page.getByRole('button', { name: 'Pause' }).click();

    await expect(page.getByText('Agent Types')).toBeVisible();
    // The bar chart should have at least one recharts bar
    const bars = page.locator('.recharts-bar-rectangle');
    await expect(async () => {
      const count = await bars.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10000 });
  });

  test('event feed shows entries after simulation produces events', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 10);
    await page.getByRole('button', { name: 'Pause' }).click();

    // Event feed items have step numbers in monospace font
    // Each event row has a step number span followed by an icon and message
    const eventItems = page.locator('.font-mono.text-gray-600');
    await expect(async () => {
      const count = await eventItems.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 10000 });
  });

  test('proposal outcomes section appears after proposals are created', async ({ page }) => {
    await gotoAndWaitForInit(page);
    // Run enough steps for proposals to be created
    await playAndWaitForSteps(page, 30);
    await page.getByRole('button', { name: 'Pause' }).click();

    await expect(page.getByText('Proposal Outcomes')).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// 3D Visualization
// ---------------------------------------------------------------------------
test.describe('Simulate Page - 3D Visualization', () => {
  test('canvas element exists on the page', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 3);

    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();
  });

  test('no WebGL context-lost errors in console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('webgl')) {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      if (err.message.toLowerCase().includes('webgl')) {
        errors.push(err.message);
      }
    });

    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 10);
    await page.getByRole('button', { name: 'Pause' }).click();

    expect(errors).toHaveLength(0);
  });

  test('canvas has non-zero dimensions', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 3);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// DAO Switching
// ---------------------------------------------------------------------------
test.describe('Simulate Page - DAO Switching', () => {
  test('selecting a different DAO resets simulation', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 5);
    await page.getByRole('button', { name: 'Pause' }).click();

    const stepBefore = await getStep(page);
    expect(stepBefore).toBeGreaterThan(0);

    // Switch DAO
    const daoSelect = page.locator('select').first();
    await daoSelect.selectOption({ index: 3 }); // pick a different DAO

    // Step should reset to 0
    await expect(async () => {
      const step = await getStep(page);
      expect(step).toBe(0);
    }).toPass({ timeout: 15000 });
  });

  test('can start simulation after switching DAO', async ({ page }) => {
    await gotoAndWaitForInit(page);

    // Switch to a different DAO
    const daoSelect = page.locator('select').first();
    await daoSelect.selectOption({ index: 5 });

    // Wait for reset to complete
    await expect(async () => {
      const step = await getStep(page);
      expect(step).toBe(0);
    }).toPass({ timeout: 15000 });

    // Play should work on the new DAO
    await playAndWaitForSteps(page, 3);
    const step = await getStep(page);
    expect(step).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
test.describe('Simulate Page - Configuration', () => {
  test('Forum toggle checkbox is functional', async ({ page }) => {
    await gotoAndWaitForInit(page);

    const forum = page.getByLabel('Forum');
    await expect(forum).toBeVisible();

    // Forum is checked by default
    await expect(forum).toBeChecked();

    // Toggle off
    await forum.uncheck();
    await expect(forum).not.toBeChecked();

    // Toggle on
    await forum.check();
    await expect(forum).toBeChecked();
  });

  test('Black Swan toggle checkbox is functional', async ({ page }) => {
    await gotoAndWaitForInit(page);

    const blackSwan = page.getByLabel('Black Swans');
    await expect(blackSwan).toBeVisible();

    // Black Swans is unchecked by default
    await expect(blackSwan).not.toBeChecked();

    // Toggle on
    await blackSwan.check();
    await expect(blackSwan).toBeChecked();

    // Toggle off
    await blackSwan.uncheck();
    await expect(blackSwan).not.toBeChecked();
  });
});
