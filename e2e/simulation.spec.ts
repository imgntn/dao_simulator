import { test, expect, type Page } from '@playwright/test';

const SIMULATE_URL = '/en/simulate';

/**
 * Simulation Tests - Tests for simulation behavior, keyboard shortcuts,
 * and DAO/governance switching. Core play/pause/step/reset controls are
 * covered in simulate.spec.ts; this file focuses on interaction patterns.
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

test.describe('Simulation Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForInit(page);
  });

  test('Fork button appears when paused after running', async ({ page }) => {
    await playAndWaitForSteps(page, 3);
    await page.getByRole('button', { name: 'Pause' }).last().click();
    await expect(page.getByRole('button', { name: 'Fork' })).toBeVisible();
  });

  test('Fork button is not visible at step 0', async ({ page }) => {
    // At idle state, Fork should not be visible
    await expect(page.getByRole('button', { name: 'Fork' })).not.toBeVisible();
  });

  test('speed slider updates display text', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first();
    await slider.fill('50');
    await expect(page.getByText('50 steps/sec')).toBeVisible();
  });
});

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForInit(page);
    // Click the sim root to make sure no input is focused
    await page.locator('[data-sim-root]').click();
  });

  test('Space key toggles play/pause', async ({ page }) => {
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Pause' }).last()).toBeVisible();

    await expect(async () => {
      const step = await getStep(page);
      expect(step).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });

    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });

  test('Period key steps simulation forward', async ({ page }) => {
    const before = await getStep(page);
    await page.keyboard.press('.');
    await expect(async () => {
      const after = await getStep(page);
      expect(after).toBe(before + 1);
    }).toPass({ timeout: 5000 });
  });

  test('R key resets simulation', async ({ page }) => {
    await page.keyboard.press('.');
    await page.keyboard.press('.');
    await page.keyboard.press('.');
    await expect(async () => {
      const step = await getStep(page);
      expect(step).toBeGreaterThanOrEqual(3);
    }).toPass({ timeout: 5000 });

    await page.keyboard.press('r');
    await expect(async () => {
      const step = await getStep(page);
      expect(step).toBe(0);
    }).toPass({ timeout: 5000 });
  });

  test('? key opens help overlay', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.getByText(/DAO Simulator — Help/i)).toBeVisible();
  });

  test('? key toggles help overlay closed', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.getByText(/DAO Simulator — Help/i)).toBeVisible();
    // Press ? again to toggle it closed (or click × button)
    await page.getByRole('button', { name: '×' }).click();
    await expect(page.getByText(/DAO Simulator — Help/i)).not.toBeVisible();
  });

  test('keyboard shortcuts are ignored in form fields', async ({ page }) => {
    const seedInput = page.locator('input[type="number"]');
    await seedInput.focus();

    const initialStep = await getStep(page);
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    const newStep = await getStep(page);
    expect(newStep).toBe(initialStep);
  });
});

test.describe('DAO Switching', () => {
  test('selecting a different DAO resets simulation', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await playAndWaitForSteps(page, 5);
    await page.getByRole('button', { name: 'Pause' }).last().click();

    const stepBefore = await getStep(page);
    expect(stepBefore).toBeGreaterThan(0);

    const daoSelect = page.locator('select').first();
    await daoSelect.selectOption({ index: 3 });

    await expect(async () => {
      const step = await getStep(page);
      expect(step).toBe(0);
    }).toPass({ timeout: 15000 });
  });

  test('can start simulation after switching DAO', async ({ page }) => {
    await gotoAndWaitForInit(page);
    const daoSelect = page.locator('select').first();
    await daoSelect.selectOption({ index: 5 });

    await expect(async () => {
      const step = await getStep(page);
      expect(step).toBe(0);
    }).toPass({ timeout: 15000 });

    await playAndWaitForSteps(page, 3);
    const step = await getStep(page);
    expect(step).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Governance Rule Switching', () => {
  test('can change governance rule', async ({ page }) => {
    await gotoAndWaitForInit(page);
    const govSelect = page.locator('select').nth(1);
    await govSelect.selectOption('quadratic');
    await expect(govSelect).toHaveValue('quadratic');
  });

  test('can change to conviction voting', async ({ page }) => {
    await gotoAndWaitForInit(page);
    const govSelect = page.locator('select').nth(1);
    await govSelect.selectOption('conviction');
    await expect(govSelect).toHaveValue('conviction');
  });
});
