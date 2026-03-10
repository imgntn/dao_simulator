import { test, expect, type Page } from '@playwright/test';

const SIMULATE_URL = '/en/simulate';

/**
 * Visualization Tests - Tests for the 3D canvas, charts, and
 * visual features of the simulator.
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

async function playAndWaitForSteps(page: Page, minSteps = 5) {
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(async () => {
    const step = await getStep(page);
    expect(step).toBeGreaterThanOrEqual(minSteps);
  }).toPass({ timeout: 30000 });
}

test.describe('3D Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForInit(page);
  });

  test('canvas element renders on page', async ({ page }) => {
    // Play a few steps so the 3D scene fully initializes
    await playAndWaitForSteps(page, 3);
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();
  });

  test('canvas has non-zero dimensions', async ({ page }) => {
    await playAndWaitForSteps(page, 3);
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('no WebGL context-lost errors during simulation', async ({ page }) => {
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

    await playAndWaitForSteps(page, 5);
    await page.getByRole('button', { name: 'Pause' }).last().click();

    expect(errors).toHaveLength(0);
  });

  test('renderer badge is visible', async ({ page }) => {
    // The renderer badge shows "WebGL" or "WebGPU" in the canvas area
    await playAndWaitForSteps(page, 3);
    await page.getByRole('button', { name: 'Pause' }).last().click();
    await expect(page.getByText(/WebGL|WebGPU/)).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Metric Cards', () => {
  test('metric cards appear after simulation runs', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 5);
    await page.getByRole('button', { name: 'Pause' }).last().click();

    const metricLabel = (text: string) =>
      page.locator('div').filter({ hasText: new RegExp(`^${text}$`) });

    await expect(metricLabel('Treasury')).toBeVisible();
    await expect(metricLabel('Token Price')).toBeVisible();
    await expect(metricLabel('Members')).toBeVisible();
    await expect(metricLabel('Proposals')).toBeVisible();
    await expect(metricLabel('Gini')).toBeVisible();
    await expect(metricLabel('Participation')).toBeVisible();
  });

  test('metric values update from initial state', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 10);
    await page.getByRole('button', { name: 'Pause' }).last().click();

    // Token price metric card shows a dollar value
    await expect(page.getByText(/\$\d+/).first()).toBeVisible();
  });
});

test.describe('Charts', () => {
  test('Recharts SVG elements render after steps', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 5);
    await page.getByRole('button', { name: 'Pause' }).last().click();

    // Recharts renders <svg> with role="application" inside chart containers
    const charts = page.locator('svg[role="application"]');
    await expect(async () => {
      const count = await charts.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 15000 });
  });

  test('agent distribution chart shows agent types', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 5);
    await page.getByRole('button', { name: 'Pause' }).last().click();

    await expect(page.getByText('Agent Types')).toBeVisible();
  });

  test('proposal outcomes section appears after proposals created', async ({ page }) => {
    await gotoAndWaitForInit(page);
    // Play simulation and wait for proposals to be created and resolved
    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByText('Proposal Outcomes')).toBeVisible({ timeout: 90000 });
    await page.getByRole('button', { name: 'Pause' }).last().click();
  });
});

test.describe('Event Feed', () => {
  test('event feed shows entries after simulation produces events', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 10);
    await page.getByRole('button', { name: 'Pause' }).last().click();

    // Event feed items show event messages like "Proposal created" or "Agent voted"
    await expect(async () => {
      const eventText = page.getByText(/Proposal created|Agent voted|Proposal approved/);
      const count = await eventText.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 15000 });
  });
});

test.describe('Delegation Graph', () => {
  test('delegation graph section exists', async ({ page }) => {
    await gotoAndWaitForInit(page);
    // Play steps so the snapshot exists (DelegationGraph renders only with a snapshot)
    await playAndWaitForSteps(page, 3);
    await page.getByRole('button', { name: 'Pause' }).last().click();
    // Delegation Graph is a collapsible section in the sidebar — scroll to it
    const delegationBtn = page.getByText(/Delegation Graph/i);
    await delegationBtn.scrollIntoViewIfNeeded();
    await expect(delegationBtn).toBeVisible();
  });
});

test.describe('Theme Toggle', () => {
  test('theme can be toggled', async ({ page }) => {
    await gotoAndWaitForInit(page);

    const themeBtn = page.getByTitle(/Switch to (light|dark) theme/i);
    await expect(themeBtn).toBeVisible();

    // Click to toggle theme
    await themeBtn.click();

    // Button should still be visible (theme changed but button persists)
    await expect(page.getByTitle(/Switch to (light|dark) theme/i)).toBeVisible();
  });
});
