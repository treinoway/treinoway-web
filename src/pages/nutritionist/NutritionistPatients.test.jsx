import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import NutritionistPatients from './NutritionistPatients';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockPatients = [
  {
    id: 'p1',
    firstName: 'Ana',
    lastName: 'Lima',
    email: 'ana@example.com',
    metabolicProfile: null,
  },
];

describe('NutritionistPatients', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.get.mockResolvedValue({ data: mockPatients });
    api.post.mockReset();
    api.delete.mockReset();
    api.put.mockReset();
  });

  // ── Loading ───────────────────────────────────────────────────────────

  it('shows loading screen while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<NutritionistPatients />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  // ── Renders ───────────────────────────────────────────────────────────

  it('renders page title and link patient button', async () => {
    renderWithRouter(<NutritionistPatients />);
    await waitFor(() => expect(screen.getByText('Pacientes')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /vincular paciente/i })).toBeInTheDocument();
  });

  it('renders patient card after loading', async () => {
    renderWithRouter(<NutritionistPatients />);
    await waitFor(() => expect(screen.getByText('Ana Lima')).toBeInTheDocument());
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  // ── Empty state ───────────────────────────────────────────────────────

  it('shows empty state when no patients', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<NutritionistPatients />);
    await waitFor(() =>
      expect(screen.getByText('Nenhum paciente vinculado ainda')).toBeInTheDocument(),
    );
  });

  // ── Link patient modal ────────────────────────────────────────────────

  it('opens link patient modal when button clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NutritionistPatients />);
    await waitFor(() => screen.getByText('Pacientes'));
    await user.click(screen.getByRole('button', { name: /vincular paciente/i }));
    expect(screen.getByRole('dialog', { name: /vincular paciente/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail do paciente/i)).toBeInTheDocument();
  });

  it('closes modal when Cancelar is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NutritionistPatients />);
    await waitFor(() => screen.getByText('Pacientes'));
    await user.click(screen.getByRole('button', { name: /vincular paciente/i }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('links patient and updates list on success', async () => {
    const user = userEvent.setup();
    const newPatient = {
      id: 'p2',
      firstName: 'Bruno',
      lastName: 'Costa',
      email: 'bruno@example.com',
      metabolicProfile: null,
    };
    api.post.mockResolvedValue({ data: newPatient });
    renderWithRouter(<NutritionistPatients />);
    await waitFor(() => screen.getByText('Pacientes'));

    await user.click(screen.getByRole('button', { name: /vincular paciente/i }));
    await user.type(screen.getByLabelText(/e-mail do paciente/i), 'bruno@example.com');
    await user.click(screen.getByRole('button', { name: 'Vincular' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/nutritionist/patients', {
        email: 'bruno@example.com',
      }),
    );
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Paciente vinculado com sucesso', 'success'));
  });

  it('shows error toast when link fails', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ userMessage: 'E-mail não encontrado.' });
    renderWithRouter(<NutritionistPatients />);
    await waitFor(() => screen.getByText('Pacientes'));

    await user.click(screen.getByRole('button', { name: /vincular paciente/i }));
    await user.type(screen.getByLabelText(/e-mail do paciente/i), 'unknown@example.com');
    await user.click(screen.getByRole('button', { name: 'Vincular' }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('E-mail não encontrado.', 'error'),
    );
  });

  // ── Unlink ────────────────────────────────────────────────────────────

  it('shows confirm dialog before unlinking', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NutritionistPatients />);
    await waitFor(() => screen.getByText('Ana Lima'));

    // Open the row menu trigger
    await user.click(screen.getByRole('button', { name: /ações de ana lima/i }));
    // Click the "Desvincular" button in the dropdown
    await user.click(screen.getByRole('button', { name: 'Desvincular' }));

    expect(screen.getByText(/desvincular ana lima/i)).toBeInTheDocument();
  });

  it('unlinking cancels when Cancelar is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<NutritionistPatients />);
    await waitFor(() => screen.getByText('Ana Lima'));

    await user.click(screen.getByRole('button', { name: /ações de ana lima/i }));
    await user.click(screen.getByRole('button', { name: 'Desvincular' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText(/desvincular ana lima/i)).not.toBeInTheDocument();
  });
});
