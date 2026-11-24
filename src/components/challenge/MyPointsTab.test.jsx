import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import MyPointsTab from './MyPointsTab';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const CHALLENGE_ID = '6f1c1f5e-1111-4a5b-9c1d-000000000001';
const STUDENT_ID = '6f1c1f5e-3333-4a5b-9c1d-000000000003';
const TRAINER_ID = '6f1c1f5e-2222-4a5b-9c1d-000000000002';

const summary = {
  totalPoints: 355,
  breakdown: { trainer_bonus: 50, workout_completed: 180, daily_checkin: 24, streak_7_days: 90, workout_feedback: 11 },
};

// Point transaction as GET /my/points returns it
const transaction = (id, action, points, createdAt) => ({
  id, studentId: STUDENT_ID, trainerId: TRAINER_ID, challengeId: CHALLENGE_ID, action, points, referenceId: null, reason: null, createdAt,
});

// First history page: ten workouts from 21/09 back, the second one a trainer bonus
const firstPage = Array.from({ length: 10 }, (_, index) => transaction(`t${index}`, 'workout_completed', 10, `2026-09-${String(21 - index).padStart(2, '0')}T12:00:00.000Z`));
firstPage[1] = transaction('t1', 'trainer_bonus', 50, '2026-09-18T12:00:00.000Z');
const secondPage = [transaction('t10', 'streak_7_days', 30, '2026-09-03T12:00:00.000Z')];

// API mock: the summary and two pages of history (11 transactions)
const mockApi = () => {
  api.get.mockImplementation((url) => {
    if (url === `/my/points/summary?challengeId=${CHALLENGE_ID}`) return Promise.resolve({ data: summary });
    if (url === `/my/points?challengeId=${CHALLENGE_ID}&page=1&limit=10`) return Promise.resolve({ data: { data: firstPage, total: 11, page: 1, limit: 10 } });
    if (url === `/my/points?challengeId=${CHALLENGE_ID}&page=2&limit=10`) return Promise.resolve({ data: { data: secondPage, total: 11, page: 2, limit: 10 } });
    return Promise.reject(new Error(`unexpected ${url}`));
  });
};

// Label and value of each summary row
const summaryRows = (card) => within(card).getAllByRole('term').map((term) => [term.textContent, term.nextElementSibling.textContent]);

describe('MyPointsTab', () => {
  beforeEach(() => {
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockReset();
  });

  it('APP-70 shows the summary by action and the paged history', async () => {
    const user = userEvent.setup();
    mockApi();
    render(<MyPointsTab challengeId={CHALLENGE_ID} />);

    const summaryCard = screen.getByRole('region', { name: 'Resumo' });
    await within(summaryCard).findByText('Treino concluído');
    expect(summaryRows(summaryCard)).toEqual([
      ['Treino concluído', '180'],
      ['Sequência de 7 dias', '90'],
      ['Check-in diário', '24'],
      ['Feedback de treino', '11'],
      ['Bônus do treinador', '50'],
    ]);

    const historyCard = screen.getByRole('region', { name: 'Histórico' });
    const rows = await within(historyCard).findAllByRole('listitem');
    expect(rows).toHaveLength(10);
    expect(within(rows[0]).getByText('Treino concluído')).toBeInTheDocument();
    expect(within(rows[0]).getByText('21/09/2026')).toBeInTheDocument();
    expect(within(rows[0]).getByText('+10')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Bônus do treinador')).toBeInTheDocument();
    expect(within(rows[1]).getByText('+50')).toHaveClass('my-points-history__points--gain');

    const previous = within(historyCard).getByRole('button', { name: 'Anterior' });
    const next = within(historyCard).getByRole('button', { name: 'Próxima' });
    expect(previous).toBeDisabled();
    expect(next).toHaveClass('btn', 'btn--neutral');

    await user.click(next);
    expect(await within(historyCard).findByText('Sequência de 7 dias')).toBeInTheDocument();
    expect(within(historyCard).getAllByRole('listitem')).toHaveLength(1);
    expect(within(historyCard).getByText('03/09/2026')).toBeInTheDocument();
    expect(within(historyCard).getByText('+30')).toBeInTheDocument();
    expect(within(historyCard).getByRole('button', { name: 'Próxima' })).toBeDisabled();
    expect(within(historyCard).getByRole('button', { name: 'Anterior' })).toBeEnabled();

    await user.click(within(historyCard).getByRole('button', { name: 'Anterior' }));
    expect(await within(historyCard).findByText('+50')).toBeInTheDocument();
    expect(within(historyCard).getAllByRole('listitem')).toHaveLength(10);
  });

  it('APP-70 keeps Anterior and Próxima visible and disabled when the history fits one page', async () => {
    api.get.mockImplementation((url) => (url.startsWith('/my/points/summary')
      ? Promise.resolve({ data: summary })
      : Promise.resolve({ data: { data: secondPage, total: 1, page: 1, limit: 10 } })));
    render(<MyPointsTab challengeId={CHALLENGE_ID} />);

    const historyCard = screen.getByRole('region', { name: 'Histórico' });
    expect(await within(historyCard).findByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(within(historyCard).getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('APP-70 shows that no points were recorded yet', async () => {
    api.get.mockImplementation((url) => (url.startsWith('/my/points/summary')
      ? Promise.resolve({ data: { totalPoints: 0, breakdown: {} } })
      : Promise.resolve({ data: { data: [], total: 0, page: 1, limit: 10 } })));
    render(<MyPointsTab challengeId={CHALLENGE_ID} />);

    expect(await within(screen.getByRole('region', { name: 'Histórico' })).findByText('Nenhum ponto registrado ainda.')).toBeInTheDocument();
    expect(await within(screen.getByRole('region', { name: 'Resumo' })).findByText('Nenhum ponto registrado ainda.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument();
  });
});
