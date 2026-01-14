import { test, expect } from '@playwright/test';
import { m, toRegex, buttons, tabs, status } from './utils/i18n-helpers';

/**
 * Dashboard Tests - Comprehensive UI testing for the main dashboard
 */
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Header', () => {
    test('displays DAO name and token symbol', async ({ page }) => {
      // Header should have the DAO name (generated)
      const header = page.locator('header');
      await expect(header).toBeVisible();

      // Should show a token symbol (starts with $)
      await expect(page.locator('header').getByText(/\$/)).toBeVisible();
    });

    test('displays connection status indicator', async ({ page }) => {
      // Should show connection status using i18n strings
      const connectedOrDisconnected = new RegExp(`${m.common.connected}|${m.common.disconnected}`, 'i');
      await expect(page.getByText(connectedOrDisconnected)).toBeVisible({ timeout: 15000 });
    });

    test('displays running/paused status', async ({ page }) => {
      // Should show running status using i18n strings
      const runningOrPaused = new RegExp(`${m.common.running}|${m.common.paused}`, 'i');
      await expect(page.getByText(runningOrPaused).first()).toBeVisible();
    });

    test('displays step counter', async ({ page }) => {
      // Should show step count
      await expect(page.getByText(/Step:/i)).toBeVisible();
    });

    test('has API Docs link', async ({ page }) => {
      const apiLink = page.getByRole('link', { name: toRegex(m.header.apiDocs) });
      await expect(apiLink).toBeVisible();
      await expect(apiLink).toHaveAttribute('href', '/api/simulation');
    });
  });

  test.describe('Navigation Tabs', () => {
    test('Overview tab is active by default', async ({ page }) => {
      const overviewTab = page.getByRole('button', { name: toRegex(tabs.overview) });
      await expect(overviewTab).toHaveClass(/bg-blue-600/);
    });

    test('can switch to 3D View tab', async ({ page }) => {
      const tab = page.getByRole('button', { name: toRegex(tabs.view3d) });
      await tab.click();
      await expect(tab).toHaveClass(/bg-blue-600/);
    });

    test('can switch to Charts tab', async ({ page }) => {
      const tab = page.getByRole('button', { name: toRegex(tabs.charts) });
      await tab.click();
      await expect(tab).toHaveClass(/bg-blue-600/);
    });

    test('can switch to Strategy tab', async ({ page }) => {
      const tab = page.getByRole('button', { name: toRegex(tabs.strategy) });
      await tab.click();
      await expect(tab).toHaveClass(/bg-blue-600/);
    });

    test('can switch to Reports tab', async ({ page }) => {
      const tab = page.getByRole('button', { name: toRegex(tabs.reports) });
      await tab.click();
      await expect(tab).toHaveClass(/bg-blue-600/);
    });

    test('tab content changes when switching', async ({ page }) => {
      // Go to Strategy tab
      await page.getByRole('button', { name: toRegex(tabs.strategy) }).click();

      // Should see Strategy Playbooks
      await expect(page.getByText(toRegex(m.strategies.playbooks))).toBeVisible();
      await expect(page.getByText(toRegex(m.presets.title))).toBeVisible();

      // Go to Reports tab
      await page.getByRole('button', { name: toRegex(tabs.reports) }).click();

      // Strategy content should be hidden, Reports visible
      await expect(page.getByText(toRegex(m.strategies.playbooks))).not.toBeVisible();
    });
  });

  test.describe('Overview Tab', () => {
    test('displays missions section', async ({ page }) => {
      // Should show mission cards
      await expect(page.getByText(/Strengthen Treasury|Protect Treasury|Fund Growth/i)).toBeVisible();
    });

    test('displays token tracker', async ({ page }) => {
      // Token tracker should be visible
      await expect(page.locator('#section-token')).toBeVisible();
    });

    test('displays DAO Map', async ({ page }) => {
      await expect(page.getByText(/DAO Map/i).first()).toBeVisible();
    });
  });

  test.describe('Strategy Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: toRegex(tabs.strategy) }).click();
    });

    test('displays strategy playbooks', async ({ page }) => {
      await expect(page.getByText(toRegex(m.strategies.playbooks))).toBeVisible();

      // Check for strategy options
      await expect(page.getByRole('button', { name: toRegex(m.strategies.baseline) })).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(m.strategies.riskOff) })).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(m.strategies.growthMode) })).toBeVisible();
    });

    test('can select a strategy', async ({ page }) => {
      const strategyButton = page.getByRole('button', { name: toRegex(m.strategies.riskOff) });
      await strategyButton.click();

      // Should show as active
      await expect(strategyButton).toContainText(toRegex(m.common.active));
    });

    test('displays simulation presets', async ({ page }) => {
      await expect(page.getByText(toRegex(m.presets.title))).toBeVisible();

      // Check for preset options
      await expect(page.getByRole('button', { name: toRegex(m.presets.balanced) })).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(m.presets.validatorFirst) })).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(m.presets.growthPush) })).toBeVisible();
    });

    test('can select a preset', async ({ page }) => {
      const presetButton = page.getByRole('button', { name: toRegex(m.presets.validatorFirst) });
      await presetButton.click();

      // Should show as selected
      await expect(presetButton).toContainText(toRegex(m.common.selected));
    });

    test('displays challenges', async ({ page }) => {
      await expect(page.getByText(toRegex(m.challenges.title)).first()).toBeVisible();
      await expect(page.getByText(toRegex(m.challenges.daily))).toBeVisible();
      await expect(page.getByText(toRegex(m.challenges.weekly))).toBeVisible();
    });

    test('challenges have start buttons', async ({ page }) => {
      const startButtons = page.getByRole('button', { name: toRegex(m.challenges.startChallenge) });
      await expect(startButtons.first()).toBeVisible();
    });
  });

  test.describe('Simulation Controls', () => {
    test('Start button is enabled when connected', async ({ page }) => {
      // Wait for connection
      await expect(page.getByText(m.common.connected)).toBeVisible({ timeout: 15000 });

      const startButton = page.getByRole('button', { name: buttons.start });
      await expect(startButton).toBeEnabled();
    });

    test('Stop button is disabled when not running', async ({ page }) => {
      await expect(page.getByText(m.common.connected)).toBeVisible({ timeout: 15000 });

      const stopButton = page.getByRole('button', { name: buttons.stop });
      await expect(stopButton).toBeDisabled();
    });

    test('Step button is enabled when connected', async ({ page }) => {
      await expect(page.getByText(m.common.connected)).toBeVisible({ timeout: 15000 });

      const stepButton = page.getByRole('button', { name: buttons.step });
      await expect(stepButton).toBeEnabled();
    });

    test('Reset button is enabled when connected', async ({ page }) => {
      await expect(page.getByText(m.common.connected)).toBeVisible({ timeout: 15000 });

      const resetButton = page.getByRole('button', { name: buttons.reset });
      await expect(resetButton).toBeEnabled();
    });

    test('speed selector has all options', async ({ page }) => {
      const speedSelect = page.locator('select').filter({ hasText: /1x|2x/ });

      // Check for all speed options
      await expect(speedSelect.locator('option[value="1"]')).toHaveText('1x');
      await expect(speedSelect.locator('option[value="2"]')).toHaveText('2x');
      await expect(speedSelect.locator('option[value="4"]')).toHaveText('4x');
      await expect(speedSelect.locator('option[value="8"]')).toHaveText('8x');
    });

    test('can change speed setting', async ({ page }) => {
      const speedSelect = page.locator('select').filter({ hasText: /1x|2x/ });
      await speedSelect.selectOption('4');
      await expect(speedSelect).toHaveValue('4');
    });
  });

  test.describe('View Mode Toggle', () => {
    test('Single DAO mode is active by default', async ({ page }) => {
      const singleDaoButton = page.getByRole('button', { name: toRegex(m.controls.singleDao) });
      await expect(singleDaoButton).toHaveClass(/bg-blue-600/);
    });

    test('can switch to DAO City mode', async ({ page }) => {
      const daoCityButton = page.getByRole('button', { name: toRegex(m.controls.daoCity) });
      await daoCityButton.click();

      await expect(daoCityButton).toHaveClass(/bg-green-600/);
    });

    test('Start button text changes with view mode', async ({ page }) => {
      // Default mode
      await expect(page.getByRole('button', { name: buttons.start })).toBeVisible();

      // Switch to city mode
      await page.getByRole('button', { name: toRegex(m.controls.daoCity) }).click();
      await expect(page.getByRole('button', { name: buttons.startCity })).toBeVisible();
    });
  });

  test.describe('Tutorial', () => {
    test('shows 5 tutorial steps', async ({ page }) => {
      const tutorial = page.getByTestId('tutorial-banner');
      // First step
      await expect(tutorial.getByText(/Step 1 of 5/i)).toBeVisible();

      // Can advance through steps
      const nextButton = tutorial.getByRole('button', { name: m.common.next });
      await nextButton.click();
      await expect(tutorial.getByText(/Step 2 of 5/i)).toBeVisible();
    });

    test('Next button changes to Done on last step', async ({ page }) => {
      const tutorial = page.getByTestId('tutorial-banner');
      // Click through all steps
      const nextButton = tutorial.getByRole('button', { name: m.common.next });

      for (let i = 0; i < 4; i++) {
        await nextButton.click();
      }

      // Last step should show Done
      await expect(tutorial.getByRole('button', { name: m.common.done })).toBeVisible();
    });

    test('clicking Done hides tutorial', async ({ page }) => {
      const tutorial = page.getByTestId('tutorial-banner');
      // Skip to last step
      const nextButton = tutorial.getByRole('button', { name: m.common.next });
      for (let i = 0; i < 4; i++) {
        await nextButton.click();
      }

      // Click Done
      await tutorial.getByRole('button', { name: m.common.done }).click();

      // Tutorial should be hidden
      await expect(page.getByText(toRegex(m.tutorial.title))).not.toBeVisible();
    });
  });

  test.describe('Pause Visuals', () => {
    test('can toggle visual pause', async ({ page }) => {
      const pauseButton = page.getByRole('button', { name: toRegex(m.controls.visualsLive) });
      await pauseButton.click();

      // Text should change
      await expect(page.getByRole('button', { name: toRegex(m.controls.visualsPaused) })).toBeVisible();
    });
  });

  test.describe('Layout Toggles', () => {
    test('quick jump bar can be toggled', async ({ page }) => {
      const toggle = page.getByRole('button', { name: toRegex(m.controls.quickJumpOff) });
      await expect(toggle).toBeVisible();

      await toggle.click();
      await expect(page.getByRole('button', { name: toRegex(m.controls.quickJumpOn) })).toBeVisible();
      await expect(page.getByRole('button', { name: toRegex(m.shortcuts.buttonLabel) })).toBeVisible();

      await page.getByRole('button', { name: toRegex(m.controls.quickJumpOn) }).click();
      await expect(page.getByRole('button', { name: toRegex(m.shortcuts.buttonLabel) })).toHaveCount(0);
    });

    test('sidebar can be toggled', async ({ page }) => {
      await expect(page.locator('nav')).toBeVisible();

      await page.getByRole('button', { name: toRegex(m.controls.sidebarOn) }).click();
      await expect(page.locator('nav')).toHaveCount(0);
    });
  });

  test.describe('Footer', () => {
    test('displays footer branding', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer.getByText(toRegex(m.footer.brand))).toBeVisible();
    });

    test('displays stack line', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer.getByText(/Next\.js/i)).toBeVisible();
      await expect(footer.getByText(/Three\.js/i)).toBeVisible();
      await expect(footer.getByText(/Recharts/i)).toBeVisible();
      await expect(footer.getByText(/Socket\.IO/i)).toBeVisible();
    });

    test('displays footer tagline', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer.getByText(toRegex(m.footer.tagline))).toBeVisible();
    });
  });

  test.describe('Sidebar Navigation', () => {
    test('sidebar nav exists', async ({ page }) => {
      // Check for the sidebar nav component
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();
    });
  });
});

