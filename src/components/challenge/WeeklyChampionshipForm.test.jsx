import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor, within } from '../../test/test-utils';
import WeeklyChampionshipForm from './WeeklyChampionshipForm';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
}));

import api from '../../api/axios';

const CONFIG_URL = '/trainer/consistency-ranking/config';
const RANKING_CONFIG = {
  timeZone: 'America/Sao_Paulo',
  minPodiumWeeks: 2,
  weights: { workouts: 60, cardio: 40, feedback: 0, hydration: 0, diet: 0 },
  activePillars: ['workouts', 'cardio'],
};
const STUDENTS = [{ id: 's1', firstName: 'Ana', lastName: 'Lima' }];
const PODIUM_HELP = 'Semanas válidas (com meta e sem pausa) que o aluno precisa somar no campeonato para disputar o pódio. Até lá, ele aparece como entrando no campeonato.';
const XP_FIELDS = ['ptsWorkoutCompleted', 'ptsStreak7Days', 'ptsStreak30Days', 'ptsDailyCheckin', 'ptsEvolutionRecord', 'ptsWorkoutFeedback'];

// Answers the ranking config (with optional overrides) and the students list
const mockSources = (config = {}) => {
  api.get.mockImplementation((url) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: { ...RANKING_CONFIG, ...config } });
    return Promise.resolve({ data: STUDENTS });
  });
};

// Renders the form with fresh callbacks and waits for the ranking config to fill the scoring
const renderForm = async () => {
  const props = { onCreate: vi.fn().mockResolvedValue(undefined), onCancel: vi.fn(), onDirtyChange: vi.fn() };
  render(<WeeklyChampionshipForm {...props} />);
  await screen.findByText('Igual ao ranking geral');
  return props;
};

// Whether element `first` comes before element `second` in the document
const isBefore = (first, second) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('WeeklyChampionshipForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T15:00:00Z'));
    mockSources();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('CPD-05 disables "Criar campeonato" while the weights do not sum 100 or no pillar is active', async () => {
    const user = userEvent.setup();
    await renderForm();
    const create = screen.getByRole('button', { name: 'Criar campeonato' });
    expect(create).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Personalizar' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' }), { target: { value: '70' } });
    expect(screen.getByText('110 de 100')).toHaveClass('weights-summary__total--invalid');
    expect(create).toBeDisabled();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' }), { target: { value: '60' } });
    expect(screen.getByText('100 de 100')).not.toHaveClass('weights-summary__total--invalid');
    expect(create).toBeEnabled();

    await user.click(screen.getByRole('switch', { name: 'Incluir Treinos no ranking' }));
    await user.click(screen.getByRole('switch', { name: 'Incluir Cardio no ranking' }));
    expect(screen.getByText('100 de 100')).toHaveClass('weights-summary__total--invalid');
    expect(create).toBeDisabled();
  });

  it('CPD-06 sends the weights and active pillars of the Pontuação section', async () => {
    const user = userEvent.setup();
    const { onCreate } = await renderForm();
    await user.type(screen.getByLabelText('Nome'), 'Verão 2027');
    await user.click(screen.getByRole('button', { name: 'Personalizar' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' }), { target: { value: '100' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor do peso de Cardio' }), { target: { value: '0' } });
    await user.click(screen.getByRole('switch', { name: 'Incluir Cardio no ranking' }));
    expect(screen.getByText('Personalizada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Criar campeonato' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    const body = onCreate.mock.calls[0][0];
    expect(body).toMatchObject({
      name: 'Verão 2027',
      format: 'weeks',
      startWeek: '2026-11-16',
      weeks: 4,
      minPodiumWeeks: 2,
      participantMode: 'all',
      anonymousRanking: false,
      weights: { workouts: 100, cardio: 0, feedback: 0, hydration: 0, diet: 0 },
      activePillars: ['workouts'],
    });
    XP_FIELDS.forEach((field) => expect(body).not.toHaveProperty(field));
  });

  it('CPD-21 shows the fields in the spec order with Cancelar and Criar campeonato', async () => {
    const user = userEvent.setup();
    const { onCancel } = await renderForm();
    const ordered = [
      screen.getByLabelText('Nome'),
      screen.getByLabelText('Descrição'),
      screen.getByLabelText('Segunda de início'),
      screen.getByLabelText('Semanas'),
      screen.getByLabelText('Mínimo para o pódio'),
      screen.getByRole('tablist', { name: 'Participantes' }),
      screen.getByRole('switch', { name: 'Ranking anônimo' }),
      screen.getByRole('region', { name: 'Pontuação' }),
      screen.getByRole('button', { name: 'Cancelar' }),
      screen.getByRole('button', { name: 'Criar campeonato' }),
    ];
    ordered.slice(1).forEach((element, index) => expect(isBefore(ordered[index], element)).toBe(true));
    const startField = screen.getByLabelText('Segunda de início').parentElement;
    const weeksField = screen.getByLabelText('Semanas').parentElement;
    expect(startField.parentElement).toBe(weeksField.parentElement);
    expect(startField.parentElement).not.toContainElement(screen.getByLabelText('Mínimo para o pódio'));

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('btn', 'btn--neutral');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('CPD-22 shows no template picker and no XP rules', async () => {
    await renderForm();
    expect(screen.queryByRole('tablist', { name: 'Modelo' })).not.toBeInTheDocument();
    expect(screen.queryByText('Modelo')).not.toBeInTheDocument();
    expect(screen.queryByText('Sprint de 1 semana')).not.toBeInTheDocument();
    expect(screen.queryByText('Regras de pontos (XP)')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar pontuações' })).not.toBeInTheDocument();
  });

  it('CPD-23 opens with an empty name, the first Monday, 4 weeks and the podium minimum capped by the weeks', async () => {
    const user = userEvent.setup();
    mockSources({ minPodiumWeeks: 3 });
    await renderForm();
    await waitFor(() => expect(screen.getByLabelText('Mínimo para o pódio')).toHaveValue('3'));
    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(screen.getByLabelText('Segunda de início')).toHaveValue('2026-11-16');
    expect(within(screen.getByLabelText('Segunda de início')).getAllByRole('option')[0]).toHaveValue('2026-11-16');
    expect(screen.getByLabelText('Semanas')).toHaveValue('4');

    await user.selectOptions(screen.getByLabelText('Semanas'), '2');
    expect(screen.getByLabelText('Mínimo para o pódio')).toHaveValue('2');
  });

  it('CPD-24 shows the podium minimum help text under the field', async () => {
    await renderForm();
    const help = screen.getByText(PODIUM_HELP);
    const podium = screen.getByLabelText('Mínimo para o pódio');
    expect(podium.parentElement).toContainElement(help);
    expect(isBefore(podium, help)).toBe(true);
    expect(help).toHaveClass('type-caption');
  });
});
