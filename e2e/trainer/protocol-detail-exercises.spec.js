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

const EXERCISE_TEMPLATES = [
  { id: '50', name: 'Agachamento', type: 'strength' },
];

test.describe('Trainer — Protocol Detail — Exercise and Training Flows', () => {
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
        body: JSON.stringify(EXERCISE_TEMPLATES),
      });
    });
  });

  test('can add a new exercise to a training', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/trainings/101/exercises`, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: '202', name: 'Flexão', sets: 3, reps: 15, load: 0, notes: '' }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(EXERCISES),
        });
      }
    });

    await page.goto('/trainer/protocols/10');

    await expect(page.getByRole('heading', { name: 'Rotina de Força' })).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Adicionar exercício ao treino Treino A' }).click();

    await expect(page.getByRole('heading', { name: 'Adicionar Exercício' })).toBeVisible({ timeout: 5000 });

    await page.locator('#exercise-form-name').fill('Flexão');
    await page.locator('#exercise-form-type').selectOption('strength');

    await page.locator('.bottom-sheet').getByRole('button', { name: 'Adicionar Exercício', exact: true }).click();

    await expect(page.locator('.bottom-sheet')).not.toBeVisible({ timeout: 5000 });
  });

  test('can add an exercise from template', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/exercises/from-template`, (route) => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: '202', name: 'Agachamento' }),
      });
    });

    await page.goto('/trainer/protocols/10');

    await expect(page.getByRole('heading', { name: 'Rotina de Força' })).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: 'Adicionar exercício ao treino Treino A' }).click();

    await expect(page.getByRole('heading', { name: 'Adicionar Exercício' })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Importar de modelo' }).click();

    await page.locator('#add-exercise-template').selectOption('50');

    await page.locator('.bottom-sheet').getByRole('button', { name: 'Adicionar', exact: true }).click();

    await expect(page.locator('.bottom-sheet')).not.toBeVisible({ timeout: 5000 });
  });

  test('can delete a training with confirmation', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/trainings/101`, (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 204, body: '' });
      } else if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TRAININGS[0]),
        });
      }
    });

    await page.goto('/trainer/protocols/10');

    await expect(page.getByRole('heading', { name: 'Rotina de Força' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Treino A')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Ações do treino Treino A' }).click();

    await page.getByRole('button', { name: 'Excluir' }).click();

    await expect(
      page.getByText('Tem certeza que deseja excluir este treino? Esta ação não pode ser desfeita.')
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.locator('.confirm-dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('can delete an exercise with confirmation', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/exercises/201`, (route) => {
      route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/trainer/protocols/10');

    await expect(page.getByRole('heading', { name: 'Rotina de Força' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Supino Reto')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Ações do exercício Supino Reto' }).click();

    await page.getByRole('button', { name: 'Remover' }).click();

    await expect(
      page.getByText('Tem certeza que deseja remover este exercício? Esta ação não pode ser desfeita.')
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.locator('.confirm-dialog')).not.toBeVisible({ timeout: 3000 });
  });

  test('can edit a training', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/trainings/101`, (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...TRAININGS[0], name: 'Treino A Editado' }),
        });
      }
    });

    await page.goto('/trainer/protocols/10');

    await expect(page.getByRole('heading', { name: 'Rotina de Força' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Treino A')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Ações do treino Treino A' }).click();

    await page.locator('button.row-menu-item', { hasText: 'Editar' }).click();

    await expect(page.getByRole('heading', { name: 'Editar Treino' })).toBeVisible({ timeout: 5000 });

    const nameInput = page.locator('.bottom-sheet .form input[type="text"]').first();
    await nameInput.fill('Treino A Editado');

    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.locator('.bottom-sheet')).not.toBeVisible({ timeout: 5000 });
  });
});
