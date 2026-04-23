import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:7884';
const basePort = new URL(baseURL).port || '7884';
const workerEnv = process.env.PLAYWRIGHT_WORKERS;
const parsedWorkers = workerEnv ? Number.parseInt(workerEnv, 10) : NaN;
// Default to 1 worker to prevent system freezes with WebGL/3D content
// Use PLAYWRIGHT_WORKERS=2 or higher if you have more resources
const workers = Number.isFinite(parsedWorkers) && parsedWorkers > 0
  ? parsedWorkers
  : 1;

/**
 * Playwright Configuration for DAO Simulator
 *
 * Run tests:
 *   npm run test:e2e           - Run headless (default)
 *   npm run test:e2e:headed    - Run with browser visible
 *   npm run test:e2e:ui        - Run with Playwright UI
 *
 * Test categories:
 *   - smoke: Quick page-load validation
 *   - dashboard: Simulator UI layout, tabs, panels
 *   - simulation: Simulation behavior, keyboard shortcuts, DAO switching
 *   - simulate: Core controls (play/pause/step/reset), metrics, charts
 *   - visualizations: 3D canvas, WebGL, charts, visual features
 *   - api: REST API tests
 *   - accessibility: A11y compliance
 *   - chromium: Homepage tests
 *   - mobile/tablet: Responsive layout tests
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  /* Global timeout for each test */
  timeout: 60000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10000,
  },

  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'on-first-retry',

    /* Headless by default */
    headless: true,
  },

  /* Configure projects for different test scenarios */
  projects: [
    /* Smoke tests - quick validation */
    {
      name: 'smoke',
      testMatch: /.*smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /* Dashboard tests - simulator UI layout, tabs, panels */
    {
      name: 'dashboard',
      testMatch: /.*dashboard\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /* Simulation tests - behavior, keyboard shortcuts, switching */
    {
      name: 'simulation',
      testMatch: /.*simulation\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      timeout: 90000,
    },

    /* API tests */
    {
      name: 'api',
      testMatch: /.*api\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /* Accessibility tests */
    {
      name: 'accessibility',
      testMatch: /.*accessibility\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /* Visualization tests - WebGL/3D, charts, visual features */
    {
      name: 'visualizations',
      testMatch: /.*visualizations\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      timeout: 120000,
    },

    /* Simulate page tests - core Web Worker simulation controls */
    {
      name: 'simulate',
      testMatch: /.*simulate\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      timeout: 120000,
    },

    /* Homepage tests */
    {
      name: 'chromium',
      testMatch: /.*example\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    /* Mobile viewport tests */
    {
      name: 'mobile',
      testMatch: /.*responsive\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },

    /* Tablet viewport tests */
    {
      name: 'tablet',
      testMatch: /.*responsive\.spec\.ts/,
      use: { ...devices['iPad Pro 11'] },
    },
  ],

  /* Run local dev server before starting the tests */
  /* Set PLAYWRIGHT_SKIP_WEBSERVER=1 to skip (if already running) */
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: `node scripts/next-server.js --dev --hostname=127.0.0.1 --port=${basePort}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120 * 1000,
        ignoreHTTPSErrors: true,
        env: {
          ...process.env,
          NODE_ENV: 'development',
          NEXT_PUBLIC_DISABLE_RUN_SUMMARY: process.env.NEXT_PUBLIC_DISABLE_RUN_SUMMARY || 'true',
        },
      },
});
