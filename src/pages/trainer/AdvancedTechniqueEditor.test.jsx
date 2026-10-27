import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import AdvancedTechniqueEditor from './AdvancedTechniqueEditor';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { DROP_SET, OWN_TECHNIQUE } from '../../test/advancedTechniqueFixtures';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();
// Test helper: LocationProbe.
const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

// Test helper: renderEditor.
const renderEditor = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/trainer/advanced-techniques/new" element={<AdvancedTechniqueEditor />} />
        <Route path="/trainer/advanced-techniques/:id" element={<AdvancedTechniqueEditor />} />
        <Route path="/trainer/advanced-techniques" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('AdvancedTechniqueEditor (criterion 9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  it('creates a technique with POST (name, description, optional media) and returns to the list', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 'new-1' } });
    renderEditor('/trainer/advanced-techniques/new');

    expect(screen.getByRole('heading', { level: 1, name: 'Nova técnica' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^nome/i), 'Negativa lenta');
    await user.type(screen.getByLabelText(/^descrição/i), 'Desce em cinco segundos.');
    await user.type(screen.getByLabelText(/url do vídeo/i), 'https://www.youtube.com/watch?v=abc123XYZ');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/advanced-techniques', {
        name: 'Negativa lenta',
        description: 'Desce em cinco segundos.',
        videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ',
      });
    });
    expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/advanced-techniques');
  });

  it('validates name and description before calling the API', async () => {
    const user = userEvent.setup();
    renderEditor('/trainer/advanced-techniques/new');

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('edits an own technique with PATCH', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: OWN_TECHNIQUE });
    api.patch.mockResolvedValue({ data: OWN_TECHNIQUE });
    renderEditor('/trainer/advanced-techniques/tech-own');

    const name = await screen.findByDisplayValue('Tempo 3-1-3');
    await user.clear(name);
    await user.type(name, 'Tempo 4-1-2');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/trainer/advanced-techniques/tech-own',
        expect.objectContaining({ name: 'Tempo 4-1-2', description: OWN_TECHNIQUE.description }),
      );
    });
  });

  it('shows a system technique read-only: disabled fields and no save button', async () => {
    api.get.mockResolvedValue({ data: DROP_SET });
    renderEditor('/trainer/advanced-techniques/tech-drop');

    expect(await screen.findByDisplayValue('Drop set')).toBeDisabled();
    expect(screen.getByLabelText(/^descrição/i)).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/técnica pública/i)).toBeInTheDocument();
  });

  it('shows not-found when the API answers 404', async () => {
    api.get.mockRejectedValue(Object.assign(new Error('nf'), { response: { status: 404 } }));
    renderEditor('/trainer/advanced-techniques/missing');

    expect(await screen.findByText('Técnica não encontrada')).toBeInTheDocument();
  });
});
