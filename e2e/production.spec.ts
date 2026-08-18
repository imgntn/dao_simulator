import { expect, test, type Page } from '@playwright/test';

function collectCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /content security policy|refused to (execute|load)/i.test(message.text())) {
      violations.push(message.text());
    }
  });
  return violations;
}

test.describe('Optimized production runtime', () => {
  test('homepage hydrates without CSP violations and permits podcast media', async ({ page }) => {
    const cspViolations = collectCspViolations(page);
    const response = await page.goto('/', { waitUntil: 'networkidle' });

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /DAO Simulator/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Launch Simulator|Enter the Sanctum/i }).first()).toBeVisible();

    const audioSource = page.locator('audio source').first();
    await expect(audioSource).toHaveAttribute('src', /pub-5203989d31a346d288f97e48812ab2e0\.r2\.dev/);
    expect(cspViolations).toEqual([]);
  });

  test('simulator hydrates and reaches interactive controls', async ({ page }) => {
    const cspViolations = collectCspViolations(page);
    await page.addInitScript(() => localStorage.setItem('sim-tutorial-complete', 'true'));
    const response = await page.goto('/en/simulate', { waitUntil: 'domcontentloaded' });

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /Simulation Control/i })).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    expect(cspViolations).toEqual([]);
  });

  test('readiness endpoint reports a valid production runtime', async ({ request }) => {
    const response = await request.get('/api/healthz');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.checks.runtimeEnv.status).toBe('ok');
  });
});
