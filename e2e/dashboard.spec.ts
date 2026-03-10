import { test, expect, type Page } from '@playwright/test';

const SIMULATE_URL = '/en/simulate';

/**
 * Dashboard Tests - Tests for the simulator UI layout, tabs, and panel features.
 * Core simulation controls (play/pause/step/reset, speed, DAO selector, toggles)
 * are covered in simulate.spec.ts; this file focuses on UI structure and navigation.
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

test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForInit(page);
  });

  test('all 5 tabs are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Interactive' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compare' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Branch' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Multi-Run' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Research' })).toBeVisible();
  });

  test('can switch to Compare tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Compare' }).click();
    await expect(page.getByRole('button', { name: 'Compare' })).toBeVisible();
  });

  test('can switch to Branch tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Branch' }).click();
    await expect(page.getByRole('button', { name: 'Branch' })).toBeVisible();
  });

  test('can switch to Multi-Run tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Multi-Run' }).click();
    await expect(page.getByRole('button', { name: 'Multi-Run' })).toBeVisible();
  });

  test('can switch to Research tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Research' }).click();
    await expect(page.getByRole('button', { name: 'Research' })).toBeVisible();
  });

  test('switching tabs preserves simulation state', async ({ page }) => {
    // Step the simulation
    await page.getByRole('button', { name: 'Step' }).click();
    await expect(async () => {
      const text = await page.getByText(/Step \d+/).innerText();
      const step = parseInt(text.match(/Step (\d+)/)?.[1] ?? '0', 10);
      expect(step).toBe(1);
    }).toPass({ timeout: 5000 });

    // Switch to Compare and back
    await page.getByRole('button', { name: 'Compare' }).click();
    await page.getByRole('button', { name: 'Interactive' }).click();

    // Step should still be 1
    const text = await page.getByText(/Step \d+/).innerText();
    const step = parseInt(text.match(/Step (\d+)/)?.[1] ?? '0', 10);
    expect(step).toBe(1);
  });
});

test.describe('Control Panel Layout', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForInit(page);
  });

  test('displays Simulation Control heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Simulation Control/i })).toBeVisible();
  });

  test('has DAO Preset dropdown with 14 DAOs', async ({ page }) => {
    const daoSelect = page.locator('select').first();
    const options = daoSelect.locator('option');
    await expect(options).toHaveCount(14);

    await expect(daoSelect).toContainText('Aave');
    await expect(daoSelect).toContainText('Uniswap');
    await expect(daoSelect).toContainText('MakerDAO');
  });

  test('has Governance Rule dropdown with 8 options', async ({ page }) => {
    const govSelect = page.locator('select').nth(1);
    const options = govSelect.locator('option');
    await expect(options).toHaveCount(8);

    await expect(govSelect).toContainText('Simple Majority');
    await expect(govSelect).toContainText('Quadratic Voting');
    await expect(govSelect).toContainText('Conviction Voting');
  });

  test('has speed slider with label', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();
    await expect(page.getByText(/steps\/sec/)).toBeVisible();
  });

  test('has Agent Counts section', async ({ page }) => {
    await expect(page.getByText(/Agent Counts/i)).toBeVisible();
  });
});

test.describe('Header Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForInit(page);
  });

  test('has theme toggle button', async ({ page }) => {
    const themeBtn = page.getByTitle(/Switch to (light|dark) theme/i);
    await expect(themeBtn).toBeVisible();
  });

  test('has share button', async ({ page }) => {
    const shareBtn = page.getByTitle(/Share config URL/i);
    await expect(shareBtn).toBeVisible();
  });

  test('has help button', async ({ page }) => {
    const helpBtn = page.getByTitle(/Help/i);
    await expect(helpBtn).toBeVisible();
  });

  test('help button opens help overlay', async ({ page }) => {
    const helpBtn = page.getByTitle(/Help/i);
    await helpBtn.click();
    await expect(page.getByText(/DAO Simulator — Help/i)).toBeVisible();
  });

  test('help overlay can be closed', async ({ page }) => {
    const helpBtn = page.getByTitle(/Help/i);
    await helpBtn.click();
    await expect(page.getByText(/DAO Simulator — Help/i)).toBeVisible();

    // Close via × button
    await page.getByRole('button', { name: '×' }).click();
    await expect(page.getByText(/DAO Simulator — Help/i)).not.toBeVisible();
  });
});

test.describe('Agent Guide', () => {
  test('Agent Guide section is present', async ({ page }) => {
    await gotoAndWaitForInit(page);
    const guideBtn = page.getByRole('button', { name: /Agent Guide/i });
    await expect(guideBtn).toBeVisible();
  });
});

test.describe('Floor Navigation', () => {
  test('floor navigation buttons are visible', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await expect(page.getByText(/^Floor$/i)).toBeVisible();
  });
});

