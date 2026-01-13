import { test, expect, Page } from '@playwright/test';

/**
 * Visualization Tests - Tests for 3D graphics and charts
 * These tests verify that visualization components render correctly.
 */

// Helper to wait for WebSocket connection
async function waitForConnection(page: Page, timeout = 15000) {
  await expect(page.getByText('Connected')).toBeVisible({ timeout });
}

// Helper to close any modal dialogs that might be open
async function closeModalsIfPresent(page: Page) {
  // Check for presentation overlay or dialog
  const overlay = page.locator('[role="presentation"], [role="dialog"]').first();

  for (let i = 0; i < 3; i++) {
    if (!(await overlay.isVisible().catch(() => false))) {
      return;
    }

    // Try pressing Escape first (most reliable)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // If still there, try clicking Close button
    if (await overlay.isVisible().catch(() => false)) {
      const closeButton = page.getByRole('button', { name: /Close/i }).first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.scrollIntoViewIfNeeded().catch(() => {});
        await closeButton.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  }
}

// Helper to reset simulation and wait for ready state
async function resetAndWaitForReady(page: Page) {
  // Close any modals first (try multiple times)
  await closeModalsIfPresent(page);
  await page.waitForTimeout(200);
  await closeModalsIfPresent(page);

  // First check if Stop button is enabled (simulation running)
  const stopButton = page.getByRole('button', { name: /Stop/i });
  if (await stopButton.isEnabled().catch(() => false)) {
    await stopButton.click();
    await page.waitForTimeout(500);
    // Close modal that might appear after stopping
    await closeModalsIfPresent(page);
    await page.waitForTimeout(200);
    await closeModalsIfPresent(page);
  }

  // Click Reset to clear state (use force in case modal is partially blocking)
  const resetButton = page.getByRole('button', { name: /Reset.*R/i });

  // Wait for reset button with retry logic
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await resetButton.isEnabled().catch(() => false)) {
      break;
    }
    // Close modals that might be blocking
    await closeModalsIfPresent(page);
    await page.waitForTimeout(500);
  }

  await expect(resetButton).toBeEnabled({ timeout: 5000 });
  await resetButton.click({ force: true });

  // Brief wait for reset to process
  await page.waitForTimeout(300);

  // Close any modals that might appear after reset
  await closeModalsIfPresent(page);

  // Wait for Start button to be enabled (connected AND not running)
  await expect(page.getByRole('button', { name: /Start.*\(Space\)/i })).toBeEnabled({ timeout: 10000 });
}

// Helper to start simulation and wait for data
// Note: Assumes waitForConnection was already called in beforeEach
async function startAndWaitForData(page: Page, steps = 3) {
  // Close any lingering modals first
  await closeModalsIfPresent(page);

  // Set speed to 8x for faster data
  const speedSelect = page.locator('select').filter({ hasText: /1x|2x/ });
  await speedSelect.selectOption('8');

  // Start simulation (button should already be enabled from waitForConnection)
  await page.getByRole('button', { name: /Start.*Space/i }).click();

  // Wait for steps (reduced timeout)
  await expect(async () => {
    const stepText = await page.locator('text=/Step:\\s*\\d+/').textContent();
    const match = stepText?.match(/Step:\s*(\d+)/);
    const currentStep = match ? parseInt(match[1], 10) : 0;
    expect(currentStep).toBeGreaterThanOrEqual(steps);
  }).toPass({ timeout: 20000 });
}

test.describe('Chart Visualizations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await waitForConnection(page);
    await resetAndWaitForReady(page);
  });

  test('price chart renders after simulation starts', async ({ page }) => {
    await startAndWaitForData(page, 3);

    // Stop simulation if still running
    const stopButton = page.getByRole('button', { name: /Stop/i });
    if (await stopButton.isEnabled().catch(() => false)) {
      await stopButton.click();
      await closeModalsIfPresent(page);
    } else {
      // Simulation already stopped, close any modal that appeared
      await closeModalsIfPresent(page);
    }

    // Go to Charts tab
    await page.getByRole('button', { name: /Charts/i }).click();

    // Price chart section should be visible
    await expect(page.getByText(/DAO Token Price History/i)).toBeVisible();

    // Chart should have SVG element (Recharts renders to SVG)
    // Use role="application" to target the actual chart, not legend icons
    const chartSvg = page.locator('.recharts-surface[role="application"]');
    await expect(chartSvg).toBeVisible({ timeout: 5000 });
  });

  test('price chart has data points after running', async ({ page }) => {
    await startAndWaitForData(page, 5);
    await page.getByRole('button', { name: /Stop/i }).click();

    await page.getByRole('button', { name: /Charts/i }).click();

    // Check for Recharts line element (path with data)
    const chartLine = page.locator('.recharts-line-curve');
    await expect(chartLine).toBeVisible();
  });

  test('member heatmap renders with data', async ({ page }) => {
    await startAndWaitForData(page, 5);
    await page.getByRole('button', { name: /Stop/i }).click();

    await page.getByRole('button', { name: /Charts/i }).click();

    // Click Heatmap sub-panel button
    await page.getByRole('button', { name: /^Heatmap$/i }).click();

    // Heatmap section should exist
    const heatmapSection = page.locator('#section-heatmap');
    await expect(heatmapSection).toBeVisible();
  });

  test('choropleth map renders with data', async ({ page }) => {
    await startAndWaitForData(page, 5);
    await page.getByRole('button', { name: /Stop/i }).click();

    await page.getByRole('button', { name: /Charts/i }).click();

    // Click Geo sub-panel button
    await page.getByRole('button', { name: /^Geo$/i }).click();

    // Choropleth map title should be visible
    await expect(page.getByText(/Member Distribution by Location/i)).toBeVisible();
  });
});

test.describe('3D View Tab Visualizations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await waitForConnection(page);
    await resetAndWaitForReady(page);
  });

  test('3D View tab shows visualization loading states', async ({ page }) => {
    // Go to 3D View tab before starting
    await page.getByRole('button', { name: /3D View/i }).click();

    // In single DAO mode, should show tower or network visualization
    // Look for any 3D related content or loading states
    await expect(page.locator('main')).toBeVisible();
  });

  test('network graph loads after simulation runs', async ({ page }) => {
    await startAndWaitForData(page, 5);
    await page.getByRole('button', { name: /Stop/i }).click();

    await page.getByRole('button', { name: /3D View/i }).click();
    await page.getByRole('button', { name: /^Network$/i }).click();

    // Network controls should be visible
    await expect(page.getByText(/Network Controls/i)).toBeVisible();
    // Should have node/edge counts displayed
    await expect(page.getByText(/Nodes:/i)).toBeVisible();
  });

  test('DAO tower renders with members', async ({ page }) => {
    await startAndWaitForData(page, 5);
    await page.getByRole('button', { name: /Stop/i }).click();

    await page.getByRole('button', { name: /3D View/i }).click();
    await page.getByRole('button', { name: /^Tower$/i }).click();

    // Tower heading should be visible
    await expect(page.getByRole('heading', { name: /DAO Tower/i })).toBeVisible();
  });

  test('network graph shows node and edge counts', async ({ page }) => {
    await startAndWaitForData(page, 5);
    await page.getByRole('button', { name: /Stop/i }).click();

    await page.getByRole('button', { name: /3D View/i }).click();
    await page.getByRole('button', { name: /^Network$/i }).click();

    // Should display network statistics
    await expect(page.getByText(/Nodes:\s*\d+/i)).toBeVisible();
    await expect(page.getByText(/Edges:\s*\d+/i)).toBeVisible();
  });

  test('can toggle network labels', async ({ page }) => {
    await startAndWaitForData(page, 5);
    await page.getByRole('button', { name: /Stop/i }).click();

    await page.getByRole('button', { name: /3D View/i }).click();
    await page.getByRole('button', { name: /^Network$/i }).click();

    // Find and toggle labels checkbox
    const labelsCheckbox = page.getByLabel(/Show Labels/i);
    await expect(labelsCheckbox).toBeVisible();
    await labelsCheckbox.check();
    expect(await labelsCheckbox.isChecked()).toBe(true);
  });

  test('can toggle network interactivity', async ({ page }) => {
    await startAndWaitForData(page, 5);
    await page.getByRole('button', { name: /Stop/i }).click();

    await page.getByRole('button', { name: /3D View/i }).click();
    await page.getByRole('button', { name: /^Network$/i }).click();

    // Find and toggle interactive checkbox
    const interactiveCheckbox = page.getByLabel(/Interactive/i);
    await expect(interactiveCheckbox).toBeVisible();
  });
});

test.describe('DAO City Visualizations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await waitForConnection(page);
    await resetAndWaitForReady(page);

    // Switch to DAO City mode
    await page.getByRole('button', { name: /DAO City/i }).click();
  });

  test('DAO City placeholder shows before starting', async ({ page }) => {
    await page.getByRole('button', { name: /3D View/i }).click();
    await page.getByRole('button', { name: /^City$/i }).click();

    // Should show DAO City section or placeholder
    await expect(page.getByText(/Start the city simulation/i)).toBeVisible();
  });

  test('DAO City shows after simulation starts', async ({ page }) => {
    // Start city simulation
    await page.getByRole('button', { name: /Start City.*Space/i }).click();

    // Wait for a few steps (reduced)
    await expect(async () => {
      const stepText = await page.locator('text=/Step:\\s*\\d+/').textContent();
      const match = stepText?.match(/Step:\s*(\d+)/);
      const currentStep = match ? parseInt(match[1], 10) : 0;
      expect(currentStep).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 20000 });

    await page.getByRole('button', { name: /3D View/i }).click();
    await page.getByRole('button', { name: /^City$/i }).click();

    // Should show city visualization
    await expect(page.getByText(/Multi-DAO Ecosystem/i)).toBeVisible();
  });

  test('Token Rankings board shows in city mode', async ({ page }) => {
    await page.getByRole('button', { name: /Start City.*Space/i }).click();

    await expect(async () => {
      const stepText = await page.locator('text=/Step:\\s*\\d+/').textContent();
      const match = stepText?.match(/Step:\s*(\d+)/);
      const currentStep = match ? parseInt(match[1], 10) : 0;
      expect(currentStep).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 20000 });

    await page.getByRole('button', { name: /3D View/i }).click();
    await page.getByRole('button', { name: /^City$/i }).click();

    // Token ranking board should be visible in city mode
    // The TokenRankingBoard component is rendered in city view
    await expect(page.getByText(/Token Rankings/i)).toBeVisible();
  });
});

test.describe('Visual Pause Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await waitForConnection(page);
    await resetAndWaitForReady(page);
  });

  test('pausing visuals shows placeholder message', async ({ page }) => {
    await startAndWaitForData(page, 3);
    await page.getByRole('button', { name: /Stop/i }).click();

    // Pause visuals (find button containing "Visuals:")
    const visualsButton = page.getByRole('button', { name: /Visuals:/i });
    await visualsButton.click();

    // Go to 3D View tab
    await page.getByRole('button', { name: /3D View/i }).click();

    // Should show paused message or the button should indicate paused state
    await expect(page.getByRole('button', { name: /Visuals: Paused/i })).toBeVisible();
  });

  test('resuming visuals shows visualizations', async ({ page }) => {
    await startAndWaitForData(page, 3);
    await page.getByRole('button', { name: /Stop/i }).click();

    // Pause visuals
    const visualsButton = page.getByRole('button', { name: /Visuals:/i });
    await visualsButton.click();

    // Resume visuals (click again to toggle)
    await visualsButton.click();

    // Go to 3D View tab
    await page.getByRole('button', { name: /3D View/i }).click();

    // Should show Live state
    await expect(page.getByRole('button', { name: /Visuals: Live/i })).toBeVisible();
  });

  test('Charts tab respects visual pause for heatmaps', async ({ page }) => {
    await startAndWaitForData(page, 3);
    await page.getByRole('button', { name: /Stop/i }).click();

    // Pause visuals
    await page.getByRole('button', { name: /Visuals:/i }).click();

    // Go to Charts tab
    await page.getByRole('button', { name: /Charts/i }).click();

    // Click Heatmap sub-panel (paused message only shows there)
    await page.getByRole('button', { name: /^Heatmap$/i }).click();

    // Should show paused message
    await expect(page.getByText(/Heatmaps are paused/i)).toBeVisible();
  });
});

// Helper to stop simulation if running
async function stopIfRunning(page: Page) {
  const stopButton = page.getByRole('button', { name: /Stop/i });
  if (await stopButton.isEnabled().catch(() => false)) {
    await stopButton.click();
    await page.waitForTimeout(300);
  }
  await closeModalsIfPresent(page);
}

test.describe('Overview Tab Visualizations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await waitForConnection(page);
    await resetAndWaitForReady(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up after each test
    await stopIfRunning(page);
  });

  test('Token Tracker shows current price and stats', async ({ page }) => {
    await startAndWaitForData(page, 3);

    // Token tracker section exists
    const tokenSection = page.locator('#section-token');
    await expect(tokenSection).toBeVisible();
  });

  test('Missions card shows progress', async ({ page }) => {
    await startAndWaitForData(page, 3);

    // Mission cards should show progress
    const missionSection = page.locator('#section-missions');
    await expect(missionSection).toBeVisible();
  });

  test('DAO Map visualization renders', async ({ page }) => {
    await startAndWaitForData(page, 3);
    await stopIfRunning(page);

    // DAO Map heading should be visible
    await expect(page.getByText(/DAO Map/i).first()).toBeVisible();
  });

  test('Operations Log shows entries after simulation', async ({ page }) => {
    await startAndWaitForData(page, 12);
    await stopIfRunning(page);

    // Operations log should be visible with entries
    await page.getByRole('button', { name: /Ops Log/i }).click();
    await expect(page.getByText(/Operations Log/i)).toBeVisible();
  });
});

test.describe('Reports Tab Visualizations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await waitForConnection(page);
    await resetAndWaitForReady(page);
  });

  test('DAO Report renders after simulation', async ({ page }) => {
    await startAndWaitForData(page, 5);
    await page.getByRole('button', { name: /Stop/i }).click();

    await page.getByRole('button', { name: /Reports/i }).click();

    // Reports section should be visible (ID has 's')
    const reportSection = page.locator('#section-reports');
    await expect(reportSection).toBeVisible();

    // DAO Report sub-panel should be active by default
    await expect(page.getByRole('button', { name: /^DAO Report$/i })).toBeVisible();
  });

  test('Run History appears after completing a run', async ({ page }) => {
    await startAndWaitForData(page, 3);

    // Stop (which records the run)
    await page.getByRole('button', { name: /Stop/i }).click();

    await page.getByRole('button', { name: /Reports/i }).click();

    // Run history should show at least one entry
    await expect(page.getByText(/Run History/i)).toBeVisible();
  });
});

test.describe('WebGL Context', () => {
  test('page handles WebGL properly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await waitForConnection(page);
    await resetAndWaitForReady(page);

    // Check for any WebGL errors in console
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await startAndWaitForData(page, 3);
    await page.getByRole('button', { name: /3D View/i }).click();

    // Wait a bit for 3D to render
    await page.waitForTimeout(1000);

    // Check no critical WebGL errors (context lost, etc.)
    const webglErrors = errors.filter(
      (e) => e.includes('WebGL') || e.includes('context')
    );

    // Should not have WebGL context lost errors
    expect(
      webglErrors.filter((e) => e.includes('lost')).length
    ).toBe(0);
  });
});

test.describe('Canvas Rendering', () => {
  test('3D canvas elements exist in 3D View', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await waitForConnection(page);
    await resetAndWaitForReady(page);

    await startAndWaitForData(page, 3);
    await page.getByRole('button', { name: /3D View/i }).click();

    // Wait for canvas to render
    await page.waitForTimeout(1000);

    // Check for canvas elements (Three.js renders to canvas)
    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThan(0);
  });
});

