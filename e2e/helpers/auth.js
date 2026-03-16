/**
 * Auth helpers for E2E tests.
 *
 * Uses addInitScript to inject tokens into localStorage before the page
 * loads, so AuthContext initialises as already authenticated.
 * Must be called BEFORE page.goto().
 */

export async function loginAsTrainer(page) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'fake-trainer-token');
    localStorage.setItem('refreshToken', 'fake-refresh-token');
    localStorage.setItem('user', JSON.stringify({
      id: '1',
      email: 'trainer@test.com',
      firstName: 'Trainer',
      lastName: 'Test',
      roles: ['TRAINER'],
    }));
  });
}

export async function loginAsStudent(page) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'fake-student-token');
    localStorage.setItem('refreshToken', 'fake-refresh-token');
    localStorage.setItem('user', JSON.stringify({
      id: '2',
      email: 'student@test.com',
      firstName: 'Student',
      lastName: 'Test',
      roles: ['STUDENT'],
    }));
  });
}

/**
 * Mock the token-refresh endpoint so the interceptor does not redirect to /login
 * when it receives a 401 from a mocked route.
 */
export async function mockRefreshEndpoint(page) {
  await page.route('**/auth/refresh', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: { accessToken: 'fake-trainer-token' },
        refreshToken: 'fake-refresh-token',
      }),
    });
  });
}
