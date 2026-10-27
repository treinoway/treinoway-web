import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import AdvancedTechniques from './AdvancedTechniques';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { DROP_SET, OWN_TECHNIQUE, techniqueEnvelope } from '../../test/advancedTechniqueFixtures';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

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

describe('AdvancedTechniques library page (criterion 9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockResolvedValue(techniqueEnvelope([DROP_SET, OWN_TECHNIQUE]));
  });

  it('renders the page title and fetches /trainer/advanced-techniques', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Técnicas avançadas' })).toBeInTheDocument();
    expect(await screen.findByText('Drop set')).toBeInTheDocument();
    expect(screen.getByText('Tempo 3-1-3')).toBeInTheDocument();
    expect(api.get.mock.calls[0][0]).toBe('/trainer/advanced-techniques');
  });

  it('shows the Público badge only on system techniques', async () => {
    renderPage();
    await screen.findByText('Drop set');

    expect(screen.getAllByText('Público')).toHaveLength(1);
    const systemRow = screen.getByRole('button', { name: 'Abrir técnica Drop set' }).closest('.library-row');
    expect(within(systemRow).getByText('Público')).toBeInTheDocument();
  });

  it('offers no actions menu for system techniques but does for own ones', async () => {
    renderPage();
    await screen.findByText('Drop set');

    expect(screen.queryByRole('button', { name: /ações da técnica Drop set/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ações da técnica Tempo 3-1-3/i })).toBeInTheDocument();
  });

  it('sends the search term as q', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Drop set');

    await user.type(screen.getByRole('searchbox', { name: /buscar técnicas/i }), 'tempo');

    await waitFor(() => {
      const lastParams = api.get.mock.calls.at(-1)[1]?.params;
      expect(lastParams).toMatchObject({ q: 'tempo' });
    });
  });

  it('navigates to the editor when opening a row and when creating', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Drop set');

    await user.click(screen.getByRole('button', { name: 'Abrir técnica Tempo 3-1-3' }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/advanced-techniques/tech-own');
  });

  it('goes to /new from the "Nova técnica" button', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Drop set');

    await user.click(screen.getByRole('button', { name: /nova técnica/i }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/advanced-techniques/new');
  });

  it('deletes an own technique through the ConfirmDialog', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({ data: OWN_TECHNIQUE });
    renderPage();
    await screen.findByText('Tempo 3-1-3');

    await user.click(screen.getByRole('button', { name: /ações da técnica Tempo 3-1-3/i }));
    await user.click(screen.getByText('Excluir'));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /excluir/i }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/trainer/advanced-techniques/tech-own'));
  });

  it('does not delete when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Tempo 3-1-3');

    await user.click(screen.getByRole('button', { name: /ações da técnica Tempo 3-1-3/i }));
    await user.click(screen.getByText('Excluir'));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('shows an error state with retry when loading fails', async () => {
    api.get.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Falha de rede' }));
    renderPage();

    expect(await screen.findByText('Não foi possível carregar as técnicas')).toBeInTheDocument();
  });
});
