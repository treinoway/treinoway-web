import { test, expect } from '@playwright/test';
import { loginAsStudent, mockRefreshEndpoint } from '../helpers/auth.js';

const BASE_API = 'http://localhost:3000';

const SESSION = {
  id: 'session-1',
  status: 'in_progress',
  startedAt: '2026-03-15T10:00:00.000Z',
  durationSeconds: null,
  notes: null,
  training: { name: 'Treino A - Superior' },
  exerciseLogs: [
    {
      id: 'log-1',
      status: 'pending',
      order: 1,
      notes: null,
      exercise: { name: 'Supino Reto', sets: 4, reps: 10 },
      setLogs: [],
    },
  ],
};

test.describe('Student — Workout Session page', () => {
  test.beforeEach(async ({ page }) => {
    await mockRefreshEndpoint(page);
    await loginAsStudent(page);

    await page.route(`${BASE_API}/my/workout-sessions/session-1`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(SESSION),
        });
      } else {
        route.continue();
      }
    });
  });

  test('views workout session with exercises', async ({ page }) => {
    await page.goto('/my/workout-sessions/session-1');

    await expect(page.getByRole('heading', { name: 'Treino A - Superior' })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Supino Reto')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finalizar Treino' })).toBeVisible();
  });

  test('can log a set (weight and reps)', async ({ page }) => {
    await page.route(
      `${BASE_API}/my/workout-sessions/session-1/exercise-logs/log-1/sets`,
      (route) => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'set-1',
            setNumber: 1,
            repetitions: 10,
            load: 80,
            rpe: null,
            duration: null,
          }),
        });
      },
    );

    await page.goto('/my/workout-sessions/session-1');

    // Wait for the exercise to appear
    await expect(page.getByText('Supino Reto')).toBeVisible({ timeout: 8000 });

    // Click "Adicionar Série" to open the set form
    await page.getByRole('button', { name: 'Adicionar Série' }).click();

    // SetLogForm appears — fill required setNumber (id="setNumber-log-1")
    await page.locator('#setNumber-log-1').fill('1');

    // Fill reps (id="reps-log-1")
    await page.locator('#reps-log-1').fill('10');

    // Fill load (id="load-log-1")
    await page.locator('#load-log-1').fill('80');

    // Submit the form
    await page.getByRole('button', { name: 'Adicionar Série' }).click();

    // The new set log row should appear
    await expect(page.getByText('Série 1')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('10 reps')).toBeVisible();
    await expect(page.getByText('80 kg')).toBeVisible();
  });
});
