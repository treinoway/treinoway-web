import { test, expect } from '@playwright/test';
import { loginAsTrainer, mockRefreshEndpoint } from '../helpers/auth.js';

const BASE_API = 'http://localhost:3000';

const STUDENTS = [
  { id: '1', firstName: 'Ana', lastName: 'Silva', email: 'ana@test.com' },
  { id: '2', firstName: null, lastName: null, email: 'bob@test.com' },
];

test.describe('Trainer — Students page', () => {
  test.beforeEach(async ({ page }) => {
    await mockRefreshEndpoint(page);
    await loginAsTrainer(page);
  });

  test('lists students', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/students`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STUDENTS),
      });
    });

    await page.goto('/trainer/students');

    await expect(page.getByRole('heading', { name: 'Alunos' })).toBeVisible();
    await expect(page.getByText('Ana Silva')).toBeVisible();
    // bob has no name — check the desktop table cell
    await expect(page.getByRole('cell', { name: 'bob@test.com' })).toBeVisible();
  });

  test('shows empty state when no students', async ({ page }) => {
    await page.route(`${BASE_API}/trainer/students`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/trainer/students');

    await expect(page.getByText('Nenhum aluno vinculado ainda')).toBeVisible();
  });

  test('can navigate to student detail', async ({ page }) => {
    // Catch-all registered FIRST (lowest priority in Playwright)
    await page.route(`${BASE_API}/**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Specific route registered AFTER — takes priority (last-registered wins)
    await page.route(`${BASE_API}/trainer/students`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(STUDENTS),
      });
    });

    await page.goto('/trainer/students');

    // Wait for the list to render
    await expect(page.getByText('Ana Silva')).toBeVisible({ timeout: 5000 });

    // Click the student row link
    await page.getByRole('link', { name: /Ana Silva/ }).click();

    await page.waitForURL('**/trainer/students/1', { timeout: 5000 });
    expect(page.url()).toContain('/trainer/students/1');
  });
});
