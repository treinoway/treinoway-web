import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:3000';

test.describe('Login page', () => {
  test('shows login form with email and password fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByLabel('Senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  });

  test('shows error on invalid credentials (401)', async ({ page }) => {
    await page.route(`${BASE_API}/auth/login`, (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'INVALID_CREDENTIALS',
          messageCode: 'auth.unauthorized',
          message: 'Credenciais inválidas.',
        }),
      });
    });

    await page.goto('/login');

    await page.getByLabel('E-mail').fill('wrong@test.com');
    await page.getByLabel('Senha').fill('wrongpassword');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    // Error alert should appear — the interceptor attaches userMessage from the response
    await expect(page.locator('.alert-error')).toBeVisible({ timeout: 5000 });
  });

  test('redirects to dashboard on successful login', async ({ page }) => {
    // Register catch-all FIRST (lowest priority in Playwright — last-registered wins)
    // so specific routes registered after will take precedence
    await page.route(`${BASE_API}/**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Mock /me (registered after catch-all so it takes priority)
    await page.route(`${BASE_API}/me**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          email: 'trainer@test.com',
          firstName: 'Trainer',
          lastName: 'Test',
          roles: ['TRAINER'],
        }),
      });
    });

    // Mock /auth/login (registered last = highest priority)
    await page.route(`${BASE_API}/auth/login`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: { accessToken: 'test-access-token' },
          refreshToken: 'test-refresh-token',
        }),
      });
    });

    await page.goto('/login');

    await page.getByLabel('E-mail').fill('trainer@test.com');
    await page.getByLabel('Senha').fill('correctpassword');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();

    // Dashboard shows greeting: "Olá, Trainer! 👋" (firstName from /me response)
    await expect(page.getByText('Olá, Trainer!', { exact: false })).toBeVisible({ timeout: 10000 });
    expect(page.url()).not.toContain('/login');
  });
});
