import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '../test/test-utils';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CreateChampionshipModal from './CreateChampionshipModal';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('./PointsBottomSheet', () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="points-sheet">
      <button onClick={() => onSave({ ptsWorkoutCompleted: 20, anonymousRanking: false })}>Salvar</button>
      <button onClick={onClose}>Fechar pontos</button>
    </div>
  ),
}));

import api from '../api/axios';
const mockShowToast = vi.fn();

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onCreated: vi.fn(),
};

const renderModal = (props = {}) =>
  render(
    <MemoryRouter>
      <CreateChampionshipModal {...defaultProps} {...props} />
    </MemoryRouter>
  );

describe('CreateChampionshipModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { ptsWorkoutCompleted: 10, ptsDailyCheckin: 2, ptsStreak7Days: 50 } });
    api.post.mockResolvedValue({ data: { count: 5, id: 'new-123' } });
  });

  it('does not render when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('Criar Campeonato')).not.toBeInTheDocument();
  });

  it('renders modal title when open', () => {
    renderModal();
    expect(screen.getByText('Criar Campeonato')).toBeInTheDocument();
  });

  it('shows all 3 template cards', () => {
    renderModal();
    expect(screen.getByText('Sprint de 7 dias')).toBeInTheDocument();
    expect(screen.getByText('Desafio quinzenal')).toBeInTheDocument();
    expect(screen.getByText('Campeonato mensal')).toBeInTheDocument();
  });

  it('first template is expanded by default with scoring cards', () => {
    renderModal();
    expect(screen.getByLabelText('Nome do campeonato')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sprint Semanal')).toBeInTheDocument();
  });

  it('shows "Popular" badge on first template', () => {
    renderModal();
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });

  it('clicking a collapsed template expands it', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Desafio quinzenal' }));
    expect(screen.getByDisplayValue('Desafio 15 Dias')).toBeInTheDocument();
  });

  it('name input is editable', () => {
    renderModal();
    const input = screen.getByLabelText('Nome do campeonato');
    fireEvent.change(input, { target: { value: 'Meu Campeonato' } });
    expect(input).toHaveValue('Meu Campeonato');
  });

  it('create button calls API and onCreated on success', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 'ch-new' } });
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/challenges', expect.objectContaining({
        name: 'Sprint Semanal',
        participantMode: 'all',
      }));
    });
    await waitFor(() => {
      expect(defaultProps.onCreated).toHaveBeenCalledWith('ch-new');
    });
  });

  it('create button is disabled when name is empty', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = screen.getByLabelText('Nome do campeonato');
    await user.clear(input);
    expect(screen.getByRole('button', { name: 'Criar campeonato' })).toBeDisabled();
  });

  it('shows "Criando..." when creating is in progress', async () => {
    const user = userEvent.setup();
    let resolvePost;
    api.post.mockImplementation((url) => {
      if (url === '/trainer/challenges') {
        return new Promise((resolve) => { resolvePost = resolve; });
      }
      return Promise.resolve({ data: { count: 5 } });
    });
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    expect(await screen.findByRole('button', { name: 'Criando...' })).toBeDisabled();
    resolvePost({ data: { id: 'done' } });
  });

  it('edit scoring button opens PointsBottomSheet', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Editar pontuações' }));
    expect(screen.getByTestId('points-sheet')).toBeInTheDocument();
  });

  it('closing PointsBottomSheet hides it', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Editar pontuações' }));
    expect(screen.getByTestId('points-sheet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar pontos' }));
    expect(screen.queryByTestId('points-sheet')).not.toBeInTheDocument();
  });

  it('customize button navigates to /trainer/championships/create', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /Personalizar do zero/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/championships/create');
  });

  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('overlay click calls onClose', async () => {
    const user = userEvent.setup();
    renderModal();
    const overlay = screen.getByText('Criar Campeonato').closest('.bottom-sheet').parentElement;
    await user.click(overlay);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('escape key calls onClose', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.keyboard('{Escape}');
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('scoring cards update after editing points', async () => {
    const user = userEvent.setup();
    renderModal();
    // Default template has workout_completed: 10
    expect(screen.getByText('10')).toBeInTheDocument();
    // Open points editor
    await user.click(screen.getByRole('button', { name: 'Editar pontuações' }));
    // Mock saves ptsWorkoutCompleted: 20
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    // Card should now show 20
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('shows API error via toast on creation failure', async () => {
    const user = userEvent.setup();
    api.post
      .mockResolvedValueOnce({ data: { count: 5 } })
      .mockRejectedValueOnce({ userMessage: 'Erro ao criar' });
    renderModal();
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao criar', 'error');
    });
  });
});
