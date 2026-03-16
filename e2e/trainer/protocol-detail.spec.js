import { test, expect } from '@playwright/test';
import { loginAsTrainer, mockRefreshEndpoint } from '../helpers/auth.js';

const BASE_API = 'http://localhost:3000';

const PROTOCOL = {
  id: '10',
  name: 'Rotina de Força',
  status: 'ACTIVE',
  startDate: '2026-01-01T00:00:00.000Z',
  expirationDate: '2026-04-01T00:00:00.000Z',
  type: 'STRENGTH',
  assignee: { firstName: 'Ana', lastName: 'Silva', email: 'ana@test.com' },
};

const TRAININGS = [
  {
    id: '101',
    name: 'Treino A',
    description: '',
    category: 'strength',
    bodySegment: 'upper',
    order: 1,
    weekDay: null,
  },
];

const EXERCISES = [
  { id: '201', name: 'Supino Reto', sets: 4, reps: 10, load: 80, notes: '' },
];

test.describe('Trainer — Protocol Detail page', () => {
  test.beforeEach(async ({ page }) => {
    await mockRefreshEndpoint(page);
    await loginAsTrainer(page);

    await page.route(`${BASE_API}/trainer/protocols/10`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PROTOCOL),
      });
    });

    await page.route(`${BASE_API}/trainer/protocols/10/trainings`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TRAININGS),
      });
    });

    await page.route(`${BASE_API}/trainer/trainings/101/exercises`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EXERCISES),
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

  test('views a protocol with trainings and exercises', async ({ page }) => {
    await page.goto('/trainer/protocols/10');

    await expect(page.getByRole('heading', { name: 'Rotina de Força' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Treino A')).toBeVisible();
    await expect(page.getByText('Supino Reto')).toBeVisible();
  });

  test('can add a training to a protocol', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/protocols/10/trainings`, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: '102', name: 'Treino B', order: 2 }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TRAININGS),
        });
      }
    });

    await page.goto('/trainer/protocols/10');

    // Wait for the protocol to load
    await expect(page.getByRole('heading', { name: 'Rotina de Força' })).toBeVisible({ timeout: 8000 });

    // Click "Adicionar Treino"
    await page.getByRole('button', { name: '+ Adicionar Treino' }).click();

    // Bottom sheet should appear
    await expect(page.getByRole('heading', { name: 'Adicionar Novo Treino' })).toBeVisible();

    // The form inputs don't have htmlFor — locate by position within the bottom sheet form
    // First text input is "Nome"
    await page.locator('.bottom-sheet .form input[type="text"]').first().fill('Treino B');

    // First select in the form group for Categoria
    // The selects are: import template, category, body segment, week day, order
    // We skip the first select (template import) and use the category one
    await page.locator('.bottom-sheet .form select').nth(1).selectOption('strength');

    // Submit
    await page.getByRole('button', { name: 'Salvar' }).click();

    // Form (bottom sheet) should close
    await expect(page.locator('.bottom-sheet')).not.toBeVisible({ timeout: 5000 });
  });
});
