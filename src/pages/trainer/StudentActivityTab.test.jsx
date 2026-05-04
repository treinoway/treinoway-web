import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithRoute } from '../../test/test-utils';
import StudentActivityTab from './StudentActivityTab';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../contexts/AiChatContext', () => ({
  useAiChat: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const buildSummaryResponse = (overrides = {}) => ({
  window: { from: '2026-04-02T00:00:00.000Z', to: '2026-05-02T00:00:00.000Z' },
  sessionCounts: { completed: 12, in_progress: 0, abandoned: 4 },
  totalSessions: 16,
  completionRate: 0.75,
  lastSessionAt: '2026-05-01T17:30:00.000Z',
  currentProtocol: { id: 'p-1', name: 'Hipertrofia 12 semanas' },
  maxStreak: 5,
  sessionsPerWeek: 3.5,
  daysSinceLast: 1,
  ...overrides,
});

const buildRecentSessionsResponse = () => ({
  window: { from: '2026-04-02T00:00:00.000Z', to: '2026-05-02T00:00:00.000Z' },
  data: [
    {
      id: 'ws-1',
      trainingId: 't-1',
      trainingName: 'Treino A',
      status: 'completed',
      startedAt: '2026-05-01T18:00:00Z',
      finishedAt: '2026-05-01T19:00:00Z',
      completedSets: 4,
      skippedSets: 0,
    },
    {
      id: 'ws-2',
      trainingId: 't-2',
      trainingName: 'Treino B',
      status: 'abandoned',
      startedAt: '2026-04-29T07:00:00Z',
      finishedAt: null,
      completedSets: 2,
      skippedSets: 3,
    },
  ],
});

const buildProgressionResponse = (entries = []) => ({
  window: { from: '2026-04-02T00:00:00.000Z', to: '2026-05-02T00:00:00.000Z' },
  data: entries,
});

const buildDailyActivityResponse = () => ({
  data: [],
});

const exerciseEntry = (overrides = {}) => ({
  exerciseId: 'e-1',
  exerciseName: 'Supino reto',
  hasLoad: true,
  prescriptionMode: 'reps',
  trainingId: 't-1',
  trainingName: 'Treino A — Peito e Tríceps',
  sessionCount: 8,
  loadHistory: [70, 72.5, 75, 77.5],
  lastPerformedAt: '2026-05-01T17:45:00.000Z',
  latest: {
    date: '2026-05-01',
    maxLoad: 77.5,
    avgLoad: 75,
    totalVolume: 1500,
    completedSets: 4,
    totalReps: 32,
    avgRpe: 8,
  },
  trend: { maxLoadDelta: 7.5, maxLoadDeltaPct: 10.34 },
  ...overrides,
});

const setupApiMock = ({ summary, recent, progression, dailyActivity, summaryError } = {}) => {
  api.get.mockImplementation((url) => {
    if (url.endsWith('/dashboard/summary')) {
      if (summaryError) return Promise.reject(summaryError);
      return Promise.resolve({ data: summary ?? buildSummaryResponse() });
    }
    if (url.endsWith('/dashboard/recent-sessions'))
      return Promise.resolve({ data: recent ?? buildRecentSessionsResponse() });
    if (url.endsWith('/dashboard/exercise-progression'))
      return Promise.resolve({ data: progression ?? buildProgressionResponse([exerciseEntry()]) });
    if (url.endsWith('/dashboard/daily-activity'))
      return Promise.resolve({ data: dailyActivity ?? buildDailyActivityResponse() });
    return Promise.resolve({ data: null });
  });
};

const renderTab = (props = {}) =>
  renderWithRoute(
    <StudentActivityTab studentId="s-1" studentName="Maria Silva" {...props} />,
    { route: '/trainer/students/s-1', path: '/trainer/students/:id' },
  );

describe('StudentActivityTab', () => {
  beforeEach(() => {
    api.get.mockReset();
    mockNavigate.mockReset();
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'trainer-1' } });
    vi.mocked(useAiChat).mockReturnValue({ sendMessage: vi.fn() });
  });

  describe('PulseBand hero', () => {
    it('renders the period chip with the default 30-day label', async () => {
      setupApiMock();
      renderTab();

      expect(await screen.findByRole('button', { name: /alterar período/i })).toBeInTheDocument();
      expect(screen.getByText('Últimos 30 dias')).toBeInTheDocument();
    });

    it('renders adherence percentage in the pulse band', async () => {
      setupApiMock();
      renderTab();

      // completionRate 0.75 → adherenceLabel "75%" → PulseBand shows "75" + "%" unit
      await waitFor(() => {
        expect(screen.getByText('75')).toBeInTheDocument();
      });
    });

    it('renders "Em dia" status pill when completionRate >= 0.75', async () => {
      setupApiMock();
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Em dia')).toBeInTheDocument();
      });
    });

    it('renders "Atenção" status pill when completionRate is below success threshold', async () => {
      setupApiMock({
        summary: buildSummaryResponse({ completionRate: 0.6 }),
      });
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Atenção')).toBeInTheDocument();
      });
    });

    it('renders the active protocol name in the sash', async () => {
      setupApiMock();
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Hipertrofia 12 semanas')).toBeInTheDocument();
      });
    });

    it('renders "Atribuir rotina" CTA when protocol is null', async () => {
      setupApiMock({ summary: buildSummaryResponse({ currentProtocol: null }) });
      renderTab();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /atribuir rotina/i }),
        ).toBeInTheDocument();
      });
    });

    it('navigates to /trainer/protocols/new when "Atribuir rotina" is clicked', async () => {
      const user = userEvent.setup();
      setupApiMock({ summary: buildSummaryResponse({ currentProtocol: null }) });
      renderTab();

      await screen.findByRole('button', { name: /atribuir rotina/i });
      await user.click(screen.getByRole('button', { name: /atribuir rotina/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocols/new?studentId=s-1');
    });

    it('renders "Sem dados" pill and empty message when totalSessions is 0', async () => {
      setupApiMock({
        summary: buildSummaryResponse({
          completionRate: null,
          sessionCounts: { completed: 0, in_progress: 0, abandoned: 0 },
          totalSessions: 0,
        }),
      });
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Sem dados')).toBeInTheDocument();
      });
      expect(screen.getByText(/Aluno ainda não treinou/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Ver últimos 12 meses' }),
      ).toBeInTheDocument();
    });
  });

  describe('Sessões recentes scan zone', () => {
    it('renders Sessões recentes heading with session rows', async () => {
      setupApiMock();
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Sessões recentes')).toBeInTheDocument();
      });
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });

    it('renders "Ver todas" CTA in the sessions header', async () => {
      setupApiMock();
      renderTab();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Ver todas' })).toBeInTheDocument();
      });
    });

    it('navigates to the sessions page with date params when "Ver todas" is clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderTab();

      await screen.findByText('Sessões recentes');
      await user.click(screen.getByRole('button', { name: 'Ver todas' }));

      expect(mockNavigate).toHaveBeenCalled();
      const target = mockNavigate.mock.calls[0][0];
      expect(target).toContain('/trainer/students/s-1/sessions');
      expect(target).toContain('from=');
      expect(target).toContain('to=');
    });
  });

  describe('Progressão de carga section', () => {
    it('renders Progressão de carga heading with vs-suffix', async () => {
      setupApiMock();
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Progressão de carga')).toBeInTheDocument();
      });
      expect(screen.getByText('· vs 1ª sessão')).toBeInTheDocument();
    });

    it('renders exercise name and TrendChip in progression row', async () => {
      setupApiMock();
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Supino reto')).toBeInTheDocument();
      });
      expect(screen.getByText('+10.34%')).toBeInTheDocument();
    });

    it('renders "Sem carga registrada" for hasLoad=false entries', async () => {
      setupApiMock({
        progression: buildProgressionResponse([
          exerciseEntry({
            exerciseId: 'e-2',
            exerciseName: 'Prancha',
            hasLoad: false,
            latest: null,
            trend: { maxLoadDelta: null, maxLoadDeltaPct: null },
          }),
        ]),
      });
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Prancha')).toBeInTheDocument();
      });
      expect(screen.getByText('Sem carga registrada')).toBeInTheDocument();
    });

    it('renders neutral TrendChip for single-session entries', async () => {
      setupApiMock({
        progression: buildProgressionResponse([
          exerciseEntry({
            exerciseId: 'e-3',
            exerciseName: 'Levantamento Terra',
            sessionCount: 1,
            trend: { maxLoadDelta: null, maxLoadDeltaPct: null },
          }),
        ]),
      });
      const { container } = renderTab();

      await waitFor(() => {
        expect(screen.getByText('Levantamento Terra')).toBeInTheDocument();
      });
      expect(container.querySelector('.trend-chip--neutral')).toBeInTheDocument();
    });

    it('navigates to the progression detail when a row is clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Supino reto')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('link', { name: /Supino reto/i }));

      expect(mockNavigate).toHaveBeenCalled();
      const target = mockNavigate.mock.calls.find((call) =>
        String(call[0]).includes('/exercises/'),
      );
      expect(target).toBeTruthy();
      expect(target[0]).toContain('/trainer/students/s-1/exercises/e-1/progression');
    });

    it('renders "Ver todos os N exercícios" footer when there are more than 5 entries', async () => {
      const entries = Array.from({ length: 8 }, (_, i) =>
        exerciseEntry({
          exerciseId: `e-${i + 1}`,
          exerciseName: `Exercício ${i + 1}`,
          trainingId: i % 2 === 0 ? 't-A' : 't-B',
          trainingName: i % 2 === 0 ? 'Treino A' : 'Treino B',
        }),
      );
      setupApiMock({ progression: buildProgressionResponse(entries) });
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Exercício 1')).toBeInTheDocument();
      });
      expect(
        screen.getByRole('button', { name: /Ver todos os 8 exercícios/ }),
      ).toBeInTheDocument();
    });
  });

  describe('Period picker', () => {
    it('opens the period picker sheet when the period chip is clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderTab();

      await user.click(await screen.findByRole('button', { name: /alterar período/i }));
      expect(screen.getByText('Período')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Últimos 30 dias' })).toBeInTheDocument();
    });
  });

  describe('Error and not-found states', () => {
    it('shows inline 404 when the summary returns STUDENT_NOT_FOUND', async () => {
      setupApiMock({
        summaryError: {
          response: { status: 404, data: { error: 'STUDENT_NOT_FOUND' } },
        },
      });
      renderTab();

      await waitFor(() => {
        expect(screen.getByText('Aluno não encontrado')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    });
  });

  describe('iArnold FAB', () => {
    it('shows the FAB and calls sendMessage with prefilled text', async () => {
      const user = userEvent.setup();
      const sendMessage = vi.fn().mockResolvedValue();
      vi.mocked(useAiChat).mockReturnValue({ sendMessage });
      setupApiMock();
      renderTab();

      await waitFor(() =>
        expect(screen.getByText('Hipertrofia 12 semanas')).toBeInTheDocument(),
      );

      await user.click(screen.getByRole('button', { name: 'Perguntar ao iArnold' }));

      expect(mockNavigate).toHaveBeenCalledWith('/trainer/ai-assistant');
      await waitFor(() => {
        expect(sendMessage).toHaveBeenCalledWith('Como posso ajudar com Maria Silva?');
      });
    });

    it('emphasizes the FAB when completionRate is below 50%', async () => {
      setupApiMock({
        summary: buildSummaryResponse({
          completionRate: 0.3,
          sessionCounts: { completed: 3, in_progress: 0, abandoned: 7 },
          totalSessions: 10,
        }),
      });
      const { container } = renderTab();

      await waitFor(() => {
        expect(container.querySelector('.iarnold-fab--emphasized')).toBeInTheDocument();
      });
    });

    it('does not emphasize the FAB when completionRate is above the threshold', async () => {
      setupApiMock();
      const { container } = renderTab();

      await waitFor(() => {
        expect(screen.getByText('75')).toBeInTheDocument();
      });
      expect(container.querySelector('.iarnold-fab--emphasized')).not.toBeInTheDocument();
    });
  });

  describe('Refetch dimming', () => {
    it('dims the data area while a refetch is in flight after a period change', async () => {
      const user = userEvent.setup();
      setupApiMock();
      const { container } = renderTab();

      await waitFor(() =>
        expect(screen.getByText('Hipertrofia 12 semanas')).toBeInTheDocument(),
      );
      expect(container.querySelector('.activity-content--refetching')).not.toBeInTheDocument();

      let resolveSecond;
      api.get.mockImplementation((url) => {
        if (url.endsWith('/dashboard/summary')) {
          return new Promise((resolve) => {
            resolveSecond = () => resolve({ data: buildSummaryResponse() });
          });
        }
        if (url.endsWith('/dashboard/recent-sessions'))
          return Promise.resolve({ data: buildRecentSessionsResponse() });
        if (url.endsWith('/dashboard/exercise-progression'))
          return Promise.resolve({ data: buildProgressionResponse([exerciseEntry()]) });
        if (url.endsWith('/dashboard/daily-activity'))
          return Promise.resolve({ data: buildDailyActivityResponse() });
        return Promise.resolve({ data: null });
      });

      await user.click(screen.getByRole('button', { name: /alterar período/i }));
      await user.click(screen.getByRole('radio', { name: 'Últimos 90 dias' }));
      await user.click(screen.getByRole('button', { name: 'Aplicar' }));

      await waitFor(() => {
        expect(container.querySelector('.activity-content--refetching')).toBeInTheDocument();
      });

      if (resolveSecond) resolveSecond();
    });
  });
});
