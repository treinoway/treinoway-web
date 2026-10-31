import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000';
const TRAINER = { id: 'trainer-1', email: 'ana@example.com', firstName: 'Ana', lastName: 'Lima', roles: ['TRAINER'], betaAccess: true, platformPlan: { tier: 'PRO', limits: { aiActionsPerStudent: 5 } } };
const VIEWPORTS = [320, 375, 412];

// Signs in as a trainer without a backend: seeds the session and answers every API call with an empty payload.
async function signInAsTrainer(page) {
  await page.addInitScript((user) => {
    localStorage.setItem('accessToken', 'e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, TRAINER);
  await page.route(`${API}/**`, (route) => {
    const isMe = new URL(route.request().url()).pathname === '/me';
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isMe ? TRAINER : []) });
  });
}

for (const width of VIEWPORTS) {
  test(`criterion 7: bottom nav items have equal width at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await signInAsTrainer(page);
    await page.goto('/trainer/students');

    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav).toBeVisible();
    const widths = await nav.locator(':scope > *').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));

    expect(widths.length).toBeGreaterThanOrEqual(4);
    const [first, ...rest] = widths;
    rest.forEach((value) => expect(Math.abs(value - first), `item widths: ${widths.join(', ')}`).toBeLessThanOrEqual(1));
    expect(widths.reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(width);
  });

  test(`criterion 7: Financeiro is reachable from the Perfil menu at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await signInAsTrainer(page);
    await page.goto('/trainer/students');

    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Perfil' }).click();

    await expect(page.getByRole('menuitem', { name: /financeiro/i })).toBeVisible();
  });
}
