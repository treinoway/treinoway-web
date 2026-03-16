import { test, expect } from '@playwright/test';
import { loginAsStudent, mockRefreshEndpoint } from '../helpers/auth.js';

const BASE_API = 'http://localhost:3000';

const PROTOCOLS = [
  {
    id: '50',
    status: 'ACTIVE',
    type: 'STRENGTH',
    startDate: '2026-01-01T00:00:00.000Z',
    expirationDate: '2026-04-01T00:00:00.000Z',
    trainer: { firstName: 'Trainer', lastName: 'Test', email: 'trainer@test.com' },
  },
];

test.describe('Student — My Protocols page', () => {
  test.beforeEach(async ({ page }) => {
    await mockRefreshEndpoint(page);
    await loginAsStudent(page);
  });

  test('lists assigned protocols', async ({ page }) => {
    await page.route(`${BASE_API}/my/protocols`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PROTOCOLS),
      });
    });

    await page.goto('/my/protocols');

    await expect(page.getByRole('heading', { name: 'Minhas Rotinas' })).toBeVisible();
    await expect(page.getByText('Rotina de Treino')).toBeVisible();
    await expect(page.getByText('Ativo')).toBeVisible();
    await expect(page.getByText('Trainer Test')).toBeVisible();
  });

  test('shows empty state when no protocols', async ({ page }) => {
    await page.route(`${BASE_API}/my/protocols`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/my/protocols');

    await expect(page.getByText('Nenhuma rotina atribuída ainda')).toBeVisible();
    await expect(page.getByText('Seu treinador irá atribuir rotinas de treino a você')).toBeVisible();
  });
});
