import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

export function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
}

export function renderWithRoute(ui, { route = '/', path = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={ui} />
        <Route path="*" element={<div data-testid="redirected" />} />
      </Routes>
    </MemoryRouter>
  );
}

export * from '@testing-library/react';
