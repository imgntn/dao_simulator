import { test, expect } from '@playwright/test';

test.describe('API Routes', () => {
  test('simulation API can create a simulation', async ({ request }) => {
    const response = await request.post('/api/simulation', {
      data: {
        num_developers: 5,
        num_investors: 5,
        governance_rule: 'majority',
      },
    });

    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('id');
    expect(responseBody).toHaveProperty('message');
  });

  test('simulation API can list all simulations', async ({ request }) => {
    // Test GET /api/simulation (without ID) to list all simulations
    const response = await request.get('/api/simulation');

    expect(response.ok()).toBeTruthy();
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('simulations');
    expect(Array.isArray(responseBody.simulations)).toBeTruthy();
  });

  test('simulation API returns 404 for non-existent simulation', async ({ request }) => {
    // Try to get a simulation that doesn't exist
    const response = await request.get('/api/simulation?id=nonexistent');

    expect(response.status()).toBe(404);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('error');
  });

  test('simulation API workflow: create, step, and retrieve', async ({ request }) => {
    const createResponse = await request.post('/api/simulation', {
      data: {
        num_developers: 3,
        num_investors: 2,
      },
    });

    expect(createResponse.ok()).toBeTruthy();

    const createBody = await createResponse.json();
    const simId = createBody.id;

    // Step the simulation forward
    const stepResponse = await request.put('/api/simulation', {
      data: {
        id: simId,
        action: 'step',
      },
    });

    expect(stepResponse.ok()).toBeTruthy();

    // Retrieve the simulation state
    const getResponse = await request.get(`/api/simulation?id=${simId}`);
    expect(getResponse.ok()).toBeTruthy();

    const stateBody = await getResponse.json();
    expect(stateBody).toHaveProperty('id');
    expect(stateBody).toHaveProperty('summary');
  });

  test('simulation data API endpoint responds', async ({ request }) => {
    const response = await request.get('/api/simulation/data');

    expect(response.status()).toBe(400);
    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('error');
  });
});

