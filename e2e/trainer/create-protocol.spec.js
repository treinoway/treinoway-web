import { test, expect } from '@playwright/test';
import { loginAsTrainer, mockRefreshEndpoint } from '../helpers/auth.js';

const BASE_API = 'http://localhost:3000';

const STUDENTS = [
  { id: '5', firstName: 'Carlos', lastName: 'Souza', email: 'carlos@test.com' },
];

test.describe('Trainer — Create Protocol page', () => {
  test.beforeEach(async ({ page }) => {
    await mockRefreshEndpoint(page);
    await loginAsTrainer(page);

    await page.route(`${BASE_API}/trainer/students`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STUDENTS),
      });
    });

    await page.route(`${BASE_API}/trainer/protocol-templates`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(`${BASE_API}/trainer/training-templates`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(`${BASE_API}/trainer/exercise-templates`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  });

  test('shows the create protocol form', async ({ page }) => {
    await page.goto('/trainer/protocols/new');

    await expect(page.getByRole('heading', { name: 'Criar Rotina' })).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#protocol-name')).toBeVisible({ timeout: 5000 });
  });

  test('creates a protocol and navigates away', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/protocols`, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: '99', name: 'Novo Protocolo' }),
        });
      }
    });

    await page.route(`${BASE_API}/trainer/protocols/99`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '99',
          name: 'Novo Protocolo',
          status: 'ACTIVE',
          startDate: '2026-01-01T00:00:00.000Z',
          expirationDate: '2026-04-01T00:00:00.000Z',
          type: 'STRENGTH',
          assignee: { firstName: 'Carlos', lastName: 'Souza', email: 'carlos@test.com' },
        }),
      });
    });

    await page.route(`${BASE_API}/trainer/protocols/99/trainings`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Navigate with studentId pre-selected to bypass the student search requirement
    await page.goto('/trainer/protocols/new?studentId=5');

    await expect(page.getByRole('heading', { name: 'Criar Rotina' })).toBeVisible({ timeout: 8000 });

    // Wait for student to be loaded and shown
    await expect(page.getByText('Carlos Souza')).toBeVisible({ timeout: 5000 });

    // Fill in required fields
    await page.locator('#protocol-name').fill('Novo Protocolo');
    await page.locator('#protocol-default-duration-weeks').fill('12');

    // Fill start and end dates
    await page.locator('#protocol-start-date').fill('2026-01-01');
    await page.locator('#protocol-end-date').fill('2026-04-01');

    await page.getByRole('button', { name: 'Salvar' }).click();

    // After successful creation, should navigate to the protocol detail page
    await expect(page).toHaveURL(/\/trainer\/protocols\/99/, { timeout: 8000 });
  });
});
