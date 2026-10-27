import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import AdvancedTechniques from './AdvancedTechniques';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { DROP_SET, REST_PAUSE, OWN_TECHNIQUE, techniqueEnvelope } from '../../test/advancedTechniqueFixtures';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Test helper: LocationProbe.
const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

// Test helper: renderPage.
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/trainer/advanced-techniques']}>
      <Routes>
        <Route path="/trainer/advanced-techniques" element={<AdvancedTechniques />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('AdvancedTechniques own-techniques hint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  it('shows the hint when only system techniques exist and navigates on CTA', async () => {
    api.get.mockResolvedValue(techniqueEnvelope([DROP_SET, REST_PAUSE]));
    renderPage();

    expect(await screen.findByText('Você ainda não criou técnicas próprias.')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: 'Nova técnica' });
    await userEvent.click(buttons[buttons.length - 1]);
    expect(screen.getByTestId('location')).toHaveTextContent('/trainer/advanced-techniques/new');
  });

  it('hides the hint when the trainer has own techniques', async () => {
    api.get.mockResolvedValue(techniqueEnvelope([DROP_SET, OWN_TECHNIQUE]));
    renderPage();

    await screen.findByText('Drop set');
    expect(screen.queryByText('Você ainda não criou técnicas próprias.')).not.toBeInTheDocument();
  });
});
