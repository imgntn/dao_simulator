import { test, expect } from '@playwright/test';

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
      // Should show connection status
      const connectionStatus = page.getByText(/Connected|Disconnected/i);
      await expect(connectionStatus).toBeVisible({ timeout: 15000 });
    });

    test('displays running/paused status', async ({ page }) => {
      // Should show running status
      await expect(page.getByText(/Running|Paused/i).first()).toBeVisible();
    });

    test('displays step counter', async ({ page }) => {
      // Should show step count
      await expect(page.getByText(/Step:/i)).toBeVisible();
    });

    test('has API Docs link', async ({ page }) => {
      const apiLink = page.getByRole('link', { name: /API Docs/i });
      await expect(apiLink).toBeVisible();
      await expect(apiLink).toHaveAttribute('href', '/api/simulation');
    });
  });

  test.describe('Navigation Tabs', () => {
    test('Overview tab is active by default', async ({ page }) => {
      const overviewTab = page.getByRole('button', { name: /Overview/i });
      await expect(overviewTab).toHaveClass(/bg-blue-600/);
    });

    test('can switch to 3D View tab', async ({ page }) => {
      const tab = page.getByRole('button', { name: /3D View/i });
      await tab.click();
      await expect(tab).toHaveClass(/bg-blue-600/);
    });

    test('can switch to Charts tab', async ({ page }) => {
      const tab = page.getByRole('button', { name: /Charts/i });
      await tab.click();
      await expect(tab).toHaveClass(/bg-blue-600/);
    });

    test('can switch to Strategy tab', async ({ page }) => {
      const tab = page.getByRole('button', { name: /Strategy/i });
      await tab.click();
      await expect(tab).toHaveClass(/bg-blue-600/);
    });

    test('can switch to Reports tab', async ({ page }) => {
      const tab = page.getByRole('button', { name: /Reports/i });
      await tab.click();
      await expect(tab).toHaveClass(/bg-blue-600/);
    });

    test('tab content changes when switching', async ({ page }) => {
      // Go to Strategy tab
      await page.getByRole('button', { name: /Strategy/i }).click();

      // Should see Strategy Playbooks
      await expect(page.getByText(/Strategy Playbooks/i)).toBeVisible();
      await expect(page.getByText(/Simulation Presets/i)).toBeVisible();

      // Go to Reports tab
      await page.getByRole('button', { name: /Reports/i }).click();

      // Strategy content should be hidden, Reports visible
      await expect(page.getByText(/Strategy Playbooks/i)).not.toBeVisible();
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
      await page.getByRole('button', { name: /Strategy/i }).click();
    });

    test('displays strategy playbooks', async ({ page }) => {
      await expect(page.getByText(/Strategy Playbooks/i)).toBeVisible();

      // Check for strategy options
      await expect(page.getByRole('button', { name: /Baseline/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Risk-Off Treasury/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Growth Mode/i })).toBeVisible();
    });

    test('can select a strategy', async ({ page }) => {
      const strategyButton = page.getByRole('button', { name: /Risk-Off Treasury/i });
      await strategyButton.click();

      // Should show as active
      await expect(strategyButton).toContainText(/Active/i);
    });

    test('displays simulation presets', async ({ page }) => {
      await expect(page.getByText(/Simulation Presets/i)).toBeVisible();

      // Check for preset options
      await expect(page.getByRole('button', { name: /Balanced/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Validator-First/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Growth Push/i })).toBeVisible();
    });

    test('can select a preset', async ({ page }) => {
      const presetButton = page.getByRole('button', { name: /Validator-First/i });
      await presetButton.click();

      // Should show as selected
      await expect(presetButton).toContainText(/Selected/i);
    });

    test('displays challenges', async ({ page }) => {
      await expect(page.getByText(/Challenges/i).first()).toBeVisible();
      await expect(page.getByText(/Daily Challenge/i)).toBeVisible();
      await expect(page.getByText(/Weekly Challenge/i)).toBeVisible();
    });

    test('challenges have start buttons', async ({ page }) => {
      const startButtons = page.getByRole('button', { name: /Start challenge/i });
      await expect(startButtons.first()).toBeVisible();
    });
  });

  test.describe('Simulation Controls', () => {
    test('Start button is enabled when connected', async ({ page }) => {
      // Wait for connection
      await expect(page.getByText('Connected')).toBeVisible({ timeout: 15000 });

      const startButton = page.getByRole('button', { name: /Start.*Space/i });
      await expect(startButton).toBeEnabled();
    });

    test('Stop button is disabled when not running', async ({ page }) => {
      await expect(page.getByText('Connected')).toBeVisible({ timeout: 15000 });

      const stopButton = page.getByRole('button', { name: /Stop/i });
      await expect(stopButton).toBeDisabled();
    });

    test('Step button is enabled when connected', async ({ page }) => {
      await expect(page.getByText('Connected')).toBeVisible({ timeout: 15000 });

      const stepButton = page.getByRole('button', { name: /Step \(F\)/i });
      await expect(stepButton).toBeEnabled();
    });

    test('Reset button is enabled when connected', async ({ page }) => {
      await expect(page.getByText('Connected')).toBeVisible({ timeout: 15000 });

      const resetButton = page.getByRole('button', { name: /Reset/i });
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
      const singleDaoButton = page.getByRole('button', { name: /Single DAO/i });
      await expect(singleDaoButton).toHaveClass(/bg-blue-600/);
    });

    test('can switch to DAO City mode', async ({ page }) => {
      const daoCityButton = page.getByRole('button', { name: /DAO City/i });
      await daoCityButton.click();

      await expect(daoCityButton).toHaveClass(/bg-green-600/);
    });

    test('Start button text changes with view mode', async ({ page }) => {
      // Default mode
      await expect(page.getByRole('button', { name: /Start \(Space\)/i })).toBeVisible();

      // Switch to city mode
      await page.getByRole('button', { name: /DAO City/i }).click();
      await expect(page.getByRole('button', { name: /Start City \(Space\)/i })).toBeVisible();
    });
  });

  test.describe('Tutorial', () => {
    test('shows 5 tutorial steps', async ({ page }) => {
      const tutorial = page.getByTestId('tutorial-banner');
      // First step
      await expect(tutorial.getByText(/Step 1 of 5/i)).toBeVisible();

      // Can advance through steps
      const nextButton = tutorial.getByRole('button', { name: 'Next' });
      await nextButton.click();
      await expect(tutorial.getByText(/Step 2 of 5/i)).toBeVisible();
    });

    test('Next button changes to Done on last step', async ({ page }) => {
      const tutorial = page.getByTestId('tutorial-banner');
      // Click through all steps
      const nextButton = tutorial.getByRole('button', { name: 'Next' });

      for (let i = 0; i < 4; i++) {
        await nextButton.click();
      }

      // Last step should show Done
      await expect(tutorial.getByRole('button', { name: 'Done' })).toBeVisible();
    });

    test('clicking Done hides tutorial', async ({ page }) => {
      const tutorial = page.getByTestId('tutorial-banner');
      // Skip to last step
      const nextButton = tutorial.getByRole('button', { name: 'Next' });
      for (let i = 0; i < 4; i++) {
        await nextButton.click();
      }

      // Click Done
      await tutorial.getByRole('button', { name: 'Done' }).click();

      // Tutorial should be hidden
      await expect(page.getByText(/Quick start/i)).not.toBeVisible();
    });
  });

  test.describe('Pause Visuals', () => {
    test('can toggle visual pause', async ({ page }) => {
      const pauseButton = page.getByRole('button', { name: /Visuals: Live/i });
      await pauseButton.click();

      // Text should change
      await expect(page.getByRole('button', { name: /Visuals: Paused/i })).toBeVisible();
    });
  });

  test.describe('Layout Toggles', () => {
    test('quick jump bar can be toggled', async ({ page }) => {
      const toggle = page.getByRole('button', { name: /Quick jump: Off/i });
      await expect(toggle).toBeVisible();

      await toggle.click();
      await expect(page.getByRole('button', { name: /Quick jump: On/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Shortcuts/i })).toBeVisible();

      await page.getByRole('button', { name: /Quick jump: On/i }).click();
      await expect(page.getByRole('button', { name: /Shortcuts/i })).toHaveCount(0);
    });

    test('sidebar can be toggled', async ({ page }) => {
      await expect(page.locator('nav')).toBeVisible();

      await page.getByRole('button', { name: /Sidebar: On/i }).click();
      await expect(page.locator('nav')).toHaveCount(0);
    });
  });

  test.describe('Footer', () => {
    test('displays footer branding', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer.getByText(/DAO Simulator/i)).toBeVisible();
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
      await expect(footer.getByText(/Built with vision/i)).toBeVisible();
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

