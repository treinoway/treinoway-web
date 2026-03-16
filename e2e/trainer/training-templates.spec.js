import { test, expect } from '@playwright/test';
import { loginAsTrainer, mockRefreshEndpoint } from '../helpers/auth.js';

const BASE_API = 'http://localhost:3000';

const TEMPLATES = [
  {
    id: '1',
    name: 'Treino A - Superior',
    description: 'Peito e tríceps',
    category: 'strength',
    bodySegment: 'upper',
    isPublic: false,
  },
];

test.describe('Trainer — Training Templates page', () => {
  test.beforeEach(async ({ page }) => {
    await mockRefreshEndpoint(page);
    await loginAsTrainer(page);
  });

  test('lists training templates', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/training-templates`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TEMPLATES),
      });
    });

    await page.route(`${BASE_API}/trainer/exercise-templates`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/trainer/training-templates');

    await expect(page.getByRole('heading', { name: 'Treinos únicos' })).toBeVisible();
    await expect(page.getByText('Treino A - Superior')).toBeVisible();
  });

  test('creates a new template', async ({ page }) => {
    let callCount = 0;
    await page.route(`${BASE_API}/trainer/training-templates`, (route) => {
      if (route.request().method() === 'GET') {
        callCount++;
        const data = callCount > 1 ? TEMPLATES : [];
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(data),
        });
      } else if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(TEMPLATES[0]),
        });
      } else {
        route.continue();
      }
    });

    await page.route(`${BASE_API}/trainer/exercise-templates`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/trainer/training-templates');

    // Open create form
    await page.getByRole('button', { name: '+ Novo treino único' }).click();

    // Form is now visible — wait for it
    await expect(page.getByRole('heading', { name: 'Criar novo treino único' })).toBeVisible();

    // The form inputs don't have htmlFor/id associations: use placeholder or proximity
    // Fill in the "Nome" input — it's the first text input in the form
    await page.locator('.form input[type="text"]').first().fill('Treino A - Superior');

    // Select category using the select element near the "Categoria" label
    // The two selects are "Categoria" and "Segmento Corporal"
    await page.locator('.form select').nth(0).selectOption('strength');

    // Submit
    await page.getByRole('button', { name: 'Salvar' }).click();

    // Form should close — button returns
    await expect(page.getByRole('button', { name: '+ Novo treino único' })).toBeVisible({ timeout: 5000 });
  });

  test('deletes a template with confirmation dialog', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/training-templates`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TEMPLATES),
        });
      } else {
        route.continue();
      }
    });

    await page.route(`${BASE_API}/trainer/training-templates/1`, (route) => {
      route.fulfill({
        status: 204,
        body: '',
      });
    });

    await page.route(`${BASE_API}/trainer/exercise-templates`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/trainer/training-templates');

    // In card view, click the Excluir button
    await expect(page.getByRole('button', { name: 'Excluir' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Excluir' }).click();

    // Confirmation dialog should appear
    await expect(page.getByText('Tem certeza que deseja excluir este treino único?')).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: 'Confirmar' }).click();

    // Dialog should close
    await expect(page.locator('.confirm-dialog')).not.toBeVisible({ timeout: 3000 });
  });
});
