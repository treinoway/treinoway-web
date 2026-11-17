import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent, within } from '../test/test-utils';
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

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

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
import { useAuth } from '../contexts/AuthContext';
const mockShowToast = vi.fn();
const ORIGINAL_URL = window.location.href;

// Signs in a trainer with the given roles on the production hostname, where the weekly format is admin-only (AD-049)
const signInOnProduction = (roles) => {
  vi.stubEnv('DEV', false);
  globalThis.jsdom.reconfigure({ url: 'https://app.teufit.com.br/' });
  useAuth.mockReturnValue({ hasRole: (role) => roles.includes(role.toUpperCase()) });
};

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
    signInOnProduction(['TRAINER']);
    api.get.mockResolvedValue({ data: { ptsWorkoutCompleted: 10, ptsDailyCheckin: 2, ptsStreak7Days: 50 } });
    api.post.mockResolvedValue({ data: { count: 5, id: 'new-123' } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
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

const TRAINER_POINTS = { ptsWorkoutCompleted: 10, ptsStreak7Days: 50, ptsStreak30Days: 250, ptsDailyCheckin: 2, ptsEvolutionRecord: 15, ptsWorkoutFeedback: 5 };
const STUDENTS = [
  { id: '11111111-1111-1111-1111-111111111111', firstName: 'Ana', lastName: 'Lima', email: 'ana@x.com' },
  { id: '22222222-2222-2222-2222-222222222222', firstName: 'Bia', lastName: 'Souza', email: 'bia@x.com' },
  { id: '33333333-3333-3333-3333-333333333333', firstName: 'Caio', lastName: 'Reis', email: 'caio@x.com' },
];

// GET responses of the weekly form: XP rules, ranking configuration and the trainer's students
const mockWeeklySources = () => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/consistency-ranking/config') return Promise.resolve({ data: { timeZone: 'America/Sao_Paulo', minPodiumWeeks: 2 } });
    if (url === '/trainer/students') return Promise.resolve({ data: STUDENTS });
    return Promise.resolve({ data: TRAINER_POINTS });
  });
};

// Values shown on the XP rule cards of the weekly form
const pointsRules = () => within(screen.getByRole('group', { name: 'Regras de pontos (XP)' }));

// Body of the create request
const createBody = () => api.post.mock.calls.find(([url]) => url === '/trainer/challenges')[1];

describe('CreateChampionshipModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T15:00:00Z'));
    signInOnProduction(['TRAINER', 'ADMIN']);
    mockWeeklySources();
    api.post.mockResolvedValue({ data: { id: 'weekly-1' } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
  });

  it('CAMP-01 shows the weekly form fields', async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByLabelText('Nome do campeonato')).toHaveValue('Sprint Semanal');
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument();
    expect(screen.getByLabelText('Segunda de início')).toHaveValue('2026-11-16');
    expect(screen.getByLabelText('Semanas')).toHaveValue('1');
    expect(screen.getByLabelText('Mínimo para o pódio')).toHaveValue('1');
    const participants = screen.getByRole('tablist', { name: 'Participantes' });
    expect(within(participants).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Todos', 'Filtro', 'Escolhidos']);
    expect(screen.getByRole('switch', { name: 'Ranking anônimo' })).toHaveAttribute('aria-checked', 'false');
    expect(await pointsRules().findByText('50')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar pontuações' })).toBeInTheDocument();
    expect(screen.queryByText('Sprint de 7 dias')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Campeonato de 4 semanas' }));
    await user.clear(screen.getByLabelText('Nome do campeonato'));
    await user.type(screen.getByLabelText('Nome do campeonato'), 'Verão 2027');
    await user.type(screen.getByLabelText('Descrição'), 'Prêmio: camiseta');
    await user.selectOptions(screen.getByLabelText('Segunda de início'), '2026-11-23');
    await user.selectOptions(screen.getByLabelText('Semanas'), '8');
    await user.selectOptions(screen.getByLabelText('Mínimo para o pódio'), '3');
    await user.click(within(participants).getByRole('tab', { name: 'Escolhidos' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Ana Lima' }));
    await user.click(screen.getByRole('checkbox', { name: 'Caio Reis' }));
    await user.click(screen.getByRole('switch', { name: 'Ranking anônimo' }));
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));

    await waitFor(() => expect(defaultProps.onCreated).toHaveBeenCalledWith('weekly-1'));
    expect(createBody()).toEqual({
      name: 'Verão 2027',
      description: 'Prêmio: camiseta',
      format: 'weeks',
      startWeek: '2026-11-23',
      weeks: 8,
      minPodiumWeeks: 3,
      participantMode: 'explicit',
      studentIds: [STUDENTS[0].id, STUDENTS[2].id],
      ...TRAINER_POINTS,
      anonymousRanking: true,
    });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('CAMP-01 sends the filter of the Filtro mode', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('tab', { name: 'Filtro' }));
    await user.selectOptions(screen.getByLabelText('Gênero'), 'female');
    await user.type(screen.getByLabelText('Idade mínima'), '18');
    await user.type(screen.getByLabelText('Cidade'), 'Porto Alegre');
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));

    await waitFor(() => expect(createBody()).toMatchObject({ participantMode: 'filter', filter: { gender: 'female', minAge: 18, city: 'Porto Alegre' } }));
  });

  it('CAMP-02 fills weeks and point rules from the 1, 2 and 4 week templates', async () => {
    const user = userEvent.setup();
    renderModal();
    const tabs = within(screen.getByRole('tablist', { name: 'Modelo' })).getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs).toEqual(['Sprint de 1 semana', 'Desafio de 2 semanas', 'Campeonato de 4 semanas']);
    expect(await pointsRules().findByText('10')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Desafio de 2 semanas' }));
    expect(screen.getByLabelText('Semanas')).toHaveValue('2');
    expect(screen.getByLabelText('Nome do campeonato')).toHaveValue('Desafio 2 Semanas');
    expect(screen.getByLabelText('Mínimo para o pódio')).toHaveValue('2');

    await user.click(screen.getByRole('button', { name: 'Editar pontuações' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(pointsRules().getByText('20')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Campeonato de 4 semanas' }));
    expect(screen.getByLabelText('Semanas')).toHaveValue('4');
    expect(screen.getByLabelText('Nome do campeonato')).toHaveValue('Campeonato de 4 Semanas');
    expect(pointsRules().queryByText('20')).not.toBeInTheDocument();
    expect(pointsRules().getByText('10')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Sprint de 1 semana' }));
    expect(screen.getByLabelText('Semanas')).toHaveValue('1');
    expect(screen.getByLabelText('Mínimo para o pódio')).toHaveValue('1');

    await user.click(screen.getByRole('tab', { name: 'Campeonato de 4 semanas' }));
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    await waitFor(() => expect(createBody()).toMatchObject({ format: 'weeks', weeks: 4, minPodiumWeeks: 2, participantMode: 'all', ...TRAINER_POINTS }));
  });

  it('CAMP-03 offers the current Monday and the next ones, and 1 to 12 weeks, in the form', () => {
    renderModal();

    const mondays = within(screen.getByLabelText('Segunda de início')).getAllByRole('option').map((option) => option.value);
    expect(mondays.slice(0, 2)).toEqual(['2026-11-16', '2026-11-23']);
    expect(within(screen.getByLabelText('Semanas')).getAllByRole('option').map((option) => Number(option.value))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('CAMP-05 shows the name and description errors in their fields without saving', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.clear(screen.getByLabelText('Nome do campeonato'));
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    expect(screen.getByLabelText('Nome do campeonato')).toHaveClass('input--error');
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome do campeonato.');
    expect(api.post).not.toHaveBeenCalledWith('/trainer/challenges', expect.anything());

    await user.type(screen.getByLabelText('Nome do campeonato'), 'Verão');
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'x'.repeat(281) } });
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));
    expect(screen.getByLabelText('Descrição')).toHaveClass('input--error');
    expect(screen.getByRole('alert')).toHaveTextContent('A descrição pode ter até 280 caracteres.');
    expect(api.post).not.toHaveBeenCalledWith('/trainer/challenges', expect.anything());
  });

  it('CAMP-05 shows a 400 from the API in its field and keeps the form filled', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      userMessage: 'Descrição muito longa.',
      response: { status: 400, data: { error: 'VALIDATION_ERROR', messageCode: 'validation.failed', details: [{ field: 'description', messageCode: 'validation.description.maxLength' }] } },
    });
    renderModal();

    await user.type(screen.getByLabelText('Descrição'), 'Prêmio');
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Descrição muito longa.');
    expect(screen.getByLabelText('Descrição')).toHaveClass('input--error');
    expect(screen.getByLabelText('Descrição')).toHaveValue('Prêmio');
    expect(defaultProps.onCreated).not.toHaveBeenCalled();
  });

  it('CAMP-08 shows an empty filter in the participants field', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      userMessage: 'Nenhum aluno atende aos critérios do filtro.',
      response: { status: 422, data: { error: 'CHALLENGE_FILTER_EMPTY', messageCode: 'challenge.filter.empty' } },
    });
    renderModal();

    await user.click(screen.getByRole('tab', { name: 'Filtro' }));
    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nenhum aluno atende aos critérios do filtro.');
    expect(screen.getByRole('tab', { name: 'Filtro' })).toHaveAttribute('aria-selected', 'true');
  });

  it('CAMP-10 shows the plan error when the plan has no championships and keeps the create button', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      response: { status: 403, data: { error: 'CHAMPIONSHIPS_NOT_AVAILABLE', messageCode: 'platformPlan.championshipsNotAvailable', message: 'Championships are not available on your plan.' } },
    });
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Campeonatos não estão disponíveis no seu plano.');
    expect(screen.queryByText('Você não tem permissão para esta ação.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar campeonato' })).toBeEnabled();
    expect(defaultProps.onCreated).not.toHaveBeenCalled();
  });

  it('CAMP-59 asks before discarding the weekly form with changes on Escape, the close button or the overlay', async () => {
    const user = userEvent.setup();
    const nativeConfirm = vi.spyOn(window, 'confirm');
    renderModal();
    const overlay = screen.getByText('Criar Campeonato').closest('.bottom-sheet').parentElement;

    await user.type(screen.getByLabelText('Descrição'), 'Prêmio');

    await user.keyboard('{Escape}');
    expect(within(screen.getByRole('alertdialog')).getByText('Há mudanças não salvas. Descartar e sair?')).toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Há mudanças não salvas. Descartar e sair?');
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    await user.click(overlay);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Há mudanças não salvas. Descartar e sair?');
    expect(defaultProps.onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Descrição')).toHaveValue('Prêmio');

    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));
    await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalledTimes(1));
    expect(nativeConfirm).not.toHaveBeenCalled();
    nativeConfirm.mockRestore();
  });

  it('CAMP-59 closes the weekly form without asking when nothing changed', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.keyboard('{Escape}');

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('CAMP-69 keeps the dates form for non-admins in production', async () => {
    const user = userEvent.setup();
    signInOnProduction(['TRAINER']);
    renderModal();

    expect(screen.getByText('Sprint de 7 dias')).toBeInTheDocument();
    expect(screen.getByText('Desafio quinzenal')).toBeInTheDocument();
    expect(screen.getByText('Campeonato mensal')).toBeInTheDocument();
    expect(screen.queryByLabelText('Segunda de início')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Modelo' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));

    await waitFor(() => expect(createBody()).toMatchObject({ name: 'Sprint Semanal', startDate: '2026-11-18', endDate: '2026-11-24', participantMode: 'all' }));
    expect(createBody()).not.toHaveProperty('format');
  });
});
