import { expect, test, type Page } from '@playwright/test';

const SIMULATE_URL = '/en/simulate';

interface BrowserPerfSample {
  pageFps: number;
  frameMs: number;
  simRate: number;
  simMs: number;
  layoutMs: number;
  bufferUpdateMs: number;
  renderMs: number;
}

type ReportCardWindow = Window & {
  __daoPerfSamples?: BrowserPerfSample[];
  __daoPerfHealth?: { health: string; reason: string };
  __daoRendererDiagnostics?: {
    created: number;
    disposed: number;
    active: number;
    renderer: 'three';
    lastStats: { renderer: string; geometries: number; textures: number } | null;
    lifecycle: Array<{ event: 'create' | 'dispose'; active: number; at: number }>;
  };
};

async function gotoAndWaitForInit(page: Page, options: { performanceLayout?: boolean } = {}) {
  const performanceLayout = options.performanceLayout ?? false;
  await page.addInitScript(() => {
    localStorage.setItem('sim-tutorial-complete', 'true');
    localStorage.removeItem('dao-sim-layout');
  }, { performanceLayout });
  if (performanceLayout) {
    await page.addInitScript(({ performanceLayout: enabled }) => {
      if (!enabled) return;
      const visiblePanels: Record<string, boolean> = {
        transport: true,
        'floor-nav': true,
        explainability: true,
        'metrics-dashboard': false,
        'voting-heatmap': false,
        'metric-alerts': false,
        'delegation-graph': false,
        'scenario-builder': false,
        'custom-agent': false,
        'agent-guide': false,
        'event-feed': false,
        'time-scrubber': false,
      };
      localStorage.setItem('dao-sim-layout', JSON.stringify({
        panelOrder: Object.keys(visiblePanels),
        panelCollapsed: {},
        panelVisible: visiblePanels,
        sidebarWidth: 320,
      }));
    }, { performanceLayout });
  }
  await page.goto(SIMULATE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Simulation Control/i })).toBeVisible({ timeout: 60000 });
}

async function waitForStep(page: Page, minStep: number) {
  await expect(async () => {
    const text = await page.getByText(/Step \d+/).first().innerText();
    const step = Number(text.match(/Step (\d+)/)?.[1] ?? 0);
    expect(step).toBeGreaterThanOrEqual(minStep);
  }).toPass({ timeout: 45000 });
}

async function runShortScenario(page: Page) {
  await page.getByTestId('command-play').click();
  await waitForStep(page, 8);
  await page.getByTestId('command-play').click();
  await expect(page.getByTestId('command-play')).toHaveText('Play');
}

test.describe('Hard-A Report Card Gates', () => {
  test('performance budget stays inside hard-A thresholds', async ({ page }) => {
    await gotoAndWaitForInit(page, { performanceLayout: true });
    await runShortScenario(page);
    await expect(page.getByTestId('performance-hud')).toBeVisible();

    const evidence = await page.evaluate(() => {
      const reportWindow = window as ReportCardWindow;
      const samples = reportWindow.__daoPerfSamples ?? [];
      const budgetSamples = samples.slice(-4);
      const health = reportWindow.__daoPerfHealth ?? null;
      const avg = budgetSamples.reduce((acc, sample) => ({
        pageFps: acc.pageFps + sample.pageFps,
        frameMs: acc.frameMs + sample.frameMs,
        simRate: acc.simRate + sample.simRate,
        simMs: acc.simMs + sample.simMs,
        layoutMs: acc.layoutMs + sample.layoutMs,
        bufferUpdateMs: acc.bufferUpdateMs + sample.bufferUpdateMs,
        renderMs: acc.renderMs + sample.renderMs,
      }), {
        pageFps: 0,
        frameMs: 0,
        simRate: 0,
        simMs: 0,
        layoutMs: 0,
        bufferUpdateMs: 0,
        renderMs: 0,
      });
      const divisor = Math.max(1, budgetSamples.length);
      return {
        sampleCount: samples.length,
        budgetSampleCount: budgetSamples.length,
        health,
        averages: {
          pageFps: avg.pageFps / divisor,
          frameMs: avg.frameMs / divisor,
          simRate: avg.simRate / divisor,
          simMs: avg.simMs / divisor,
          layoutMs: avg.layoutMs / divisor,
          bufferUpdateMs: avg.bufferUpdateMs / divisor,
          renderMs: avg.renderMs / divisor,
        },
      };
    });

    test.info().attach('performance-budget.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    });

    expect(evidence.sampleCount).toBeGreaterThanOrEqual(2);
    expect(evidence.budgetSampleCount).toBeGreaterThanOrEqual(2);
    expect(evidence.averages.pageFps).toBeGreaterThanOrEqual(24);
    expect(evidence.averages.simMs).toBeLessThanOrEqual(32);
    expect(evidence.averages.layoutMs).toBeLessThanOrEqual(12);
    expect(evidence.averages.bufferUpdateMs).toBeLessThanOrEqual(8);
    expect(evidence.averages.renderMs).toBeLessThanOrEqual(8);
  });

  test('renderer lifecycle remains bounded across fallback switch and reset', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await runShortScenario(page);

    await page.getByLabel('Renderer mode').selectOption('canvas2d');
    await expect(page.locator('canvas').first()).toBeVisible();
    await page.getByLabel('Renderer mode').selectOption('three');
    await page.getByTestId('command-reset').click();
    await expect(page.getByText(/Step 0/).first()).toBeVisible({ timeout: 15000 });
    await runShortScenario(page);

    const diagnostics = await page.evaluate(() => {
      const reportWindow = window as ReportCardWindow;
      return reportWindow.__daoRendererDiagnostics ?? null;
    });
    test.info().attach('renderer-lifecycle.json', {
      body: JSON.stringify(diagnostics, null, 2),
      contentType: 'application/json',
    });

    expect(diagnostics).not.toBeNull();
    expect(diagnostics!.created).toBeGreaterThanOrEqual(1);
    expect(diagnostics!.disposed).toBeGreaterThanOrEqual(1);
    expect(diagnostics!.active).toBe(1);
    expect(diagnostics!.lastStats?.renderer).toBe('three');
    expect(diagnostics!.lastStats?.geometries).toBeLessThanOrEqual(12);
    expect(diagnostics!.lastStats?.textures).toBeLessThanOrEqual(4);
  });

  test('scenario import gives validation feedback and handles duplicates', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await page.getByTestId('command-presets').click();
    await expect(page.getByText('Scenario Presets')).toBeVisible();

    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: 'bad.scenario.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{bad json'),
    });
    await expect(page.getByTestId('scenario-import-status')).toContainText('invalid JSON');

    const scenario = {
      name: 'hard-a-import',
      config: {
        daoId: 'Aave',
        stepsPerSecond: 12,
        totalSteps: 240,
        governanceRule: 'majority',
        governanceQuorumPercentage: 0.18,
        seed: 99,
        blackSwanEnabled: false,
      },
    };
    await input.setInputFiles({
      name: 'hard-a-import.scenario.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(scenario)),
    });
    await expect(page.getByTestId('scenario-import-status')).toContainText('Imported hard-a-import');
    await input.setInputFiles({
      name: 'hard-a-import.scenario.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(scenario)),
    });
    await expect(page.getByTestId('scenario-import-status')).toContainText('Updated hard-a-import');
    await expect(page.getByRole('button', { name: 'hard-a-import', exact: true })).toHaveCount(1);
  });

  test('visual states produce screenshot review artifacts without overlay drift', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await runShortScenario(page);

    const scene = page.locator('[data-scene="sanctum"]');
    await expect(scene).toBeVisible();
    await test.info().attach('sanctum-default.png', {
      body: await scene.screenshot(),
      contentType: 'image/png',
    });

    await page.getByRole('button', { name: 'Toggle focus mode' }).click();
    await expect(page.getByText('Cave Chronicle')).toHaveCount(0);
    await test.info().attach('sanctum-focus.png', {
      body: await scene.screenshot(),
      contentType: 'image/png',
    });

    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect(page.getByTestId('performance-hud')).toBeVisible();
    await test.info().attach('sanctum-focus-zoomed.png', {
      body: await scene.screenshot(),
      contentType: 'image/png',
    });
  });

  test('explainability emits replayable structured provenance', async ({ page }) => {
    await gotoAndWaitForInit(page);
    await runShortScenario(page);

    const panel = page.getByTestId('explanation-record');
    await expect(panel).toBeVisible({ timeout: 15000 });
    const record = await panel.evaluate(element => JSON.parse(element.getAttribute('data-explanation') ?? '{}'));
    test.info().attach('explanation-record.json', {
      body: JSON.stringify(record, null, 2),
      contentType: 'application/json',
    });

    expect(record.id).toBeTruthy();
    expect(record.step).toBeGreaterThanOrEqual(0);
    expect(record.confidence).toBeGreaterThan(0.4);
    expect(record.metricDeltas).toHaveProperty('tokenPrice');
    expect(record.metricDeltas).toHaveProperty('treasuryFunds');
    expect(record.candidateCauses.length).toBeGreaterThanOrEqual(2);
  });
});
