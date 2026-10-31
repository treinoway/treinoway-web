import { describe, it, expect, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithRouter, screen } from '../test/test-utils';
import WebOnlyRoute from './WebOnlyRoute';

// Hoisted so the vi.mock factory below can reference this fake.
const platform = vi.hoisted(() => ({ isNative: vi.fn() }));
vi.mock('../platform', () => platform);

// Renders /signup behind the guard next to a /login page.
const renderSignup = () => renderWithRouter(
  <Routes>
    <Route path="/signup" element={<WebOnlyRoute><p>Cadastro</p></WebOnlyRoute>} />
    <Route path="/login" element={<p>Entrar</p>} />
  </Routes>,
  { route: '/signup' },
);

describe('WebOnlyRoute', () => {
  it('shows the page on the website', () => {
    platform.isNative.mockReturnValue(false);

    renderSignup();

    expect(screen.getByText('Cadastro')).toBeInTheDocument();
  });

  it('redirects the native app to the login screen', () => {
    platform.isNative.mockReturnValue(true);

    renderSignup();

    expect(screen.getByText('Entrar')).toBeInTheDocument();
    expect(screen.queryByText('Cadastro')).not.toBeInTheDocument();
  });
});
