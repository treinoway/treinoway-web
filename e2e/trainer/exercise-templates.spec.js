import { test, expect } from '@playwright/test';
import { loginAsTrainer, mockRefreshEndpoint } from '../helpers/auth.js';

const BASE_API = 'http://localhost:3000';

const TEMPLATES = [
  {
    id: '1',
    name: 'Supino Reto',
    type: 'strength',
    sets: 4,
    repetitions: { min: 8, max: 12 },
    hasLoad: true,
    suggestedLoad: 80,
    isPublic: false,
    videoUrl: '',
    notes: '',
  },
];

test.describe('Trainer — Exercise Templates page', () => {
  test.beforeEach(async ({ page }) => {
    await mockRefreshEndpoint(page);
    await loginAsTrainer(page);

    await page.route(`${BASE_API}/trainer/exercise-templates`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TEMPLATES),
      });
    });
  });

  test('lists exercise templates', async ({ page }) => {
    await page.goto('/trainer/exercise-templates');

    await expect(page.getByRole('heading', { name: 'Exercícios' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Supino Reto')).toBeVisible({ timeout: 5000 });
  });

  test('shows empty state', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/exercise-templates`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/trainer/exercise-templates');

    await expect(page.getByRole('heading', { name: 'Exercícios' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Nenhum exercício ainda')).toBeVisible({ timeout: 5000 });
  });

  test('creates a new exercise template', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/exercise-templates`, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: '2', name: 'Supino Reto', type: 'strength' }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TEMPLATES),
        });
      }
    });

    await page.goto('/trainer/exercise-templates');

    await expect(page.getByRole('heading', { name: 'Exercícios' })).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: '+ Novo exercício' }).click();

    await page.locator('#exercise-name').fill('Supino Reto');
    await page.locator('#exercise-type').selectOption('strength');

    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByRole('button', { name: '+ Novo exercício' })).toBeVisible({ timeout: 5000 });
  });

  test('deletes an exercise template with confirmation', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/exercise-templates/1`, (route) => {
      route.fulfill({
        status: 204,
        body: '',
      });
    });

    await page.goto('/trainer/exercise-templates');

    await expect(page.getByText('Supino Reto')).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Excluir' }).first().click();

    await expect(
      page.getByText('Tem certeza que deseja excluir este exercício? Esta ação não pode ser desfeita.')
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.locator('.confirm-dialog')).not.toBeVisible({ timeout: 3000 });
  });
});
