import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import SessionDetail from './SessionDetail';
import { useToast } from '../../contexts/ToastContext';
import { useAiChat } from '../../contexts/AiChatContext';
import api from '../../api/axios';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));
// IArnoldFAB reads the plan gate from useAuth (useAiAccess); a PRO quota keeps
// the button rendered for these page-level assertions.
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, platformPlan: { tier: 'PRO', limits: { aiActionsPerStudent: 3 } } },
    hasRole: (role) => role === 'TRAINER',
  }),
}));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
}));

// Stub heavy child components to isolate page-level concerns
vi.mock('../../components/SessionDetailHero', () => ({
  default: ({ session }) => (
    <div data-testid="session-hero">
      <span>{session?.training?.name}</span>
    </div>
  ),
}));

vi.mock('../../components/SessionNotesGrid', () => ({
  default: ({ studentNote }) => (
    <div data-testid="notes-grid">
      {studentNote && <span>{studentNote}</span>}
      <button type="button">Editar anotação</button>
    </div>
  ),
}));

vi.mock('../../components/SessionExerciseCard', () => ({
  default: ({ index, exerciseLog }) => (
    <div data-testid={`exercise-card-${index}`}>
      {exerciseLog.exercise?.name}
    </div>
  ),
}));

// ─── Factories ────────────────────────────────────────────────────────────────

const makeSession = (overrides = {}) => ({
  id: 'session-1',
  status: 'completed',
  startedAt: '2026-05-13T18:32:00.000Z',
  finishedAt: '2026-05-13T19:30:00.000Z',
  durationSeconds: 3480,
  notes: 'Ótima sessão.',
  training: { id: 'training-1', name: 'Treino B', category: 'Hipertrofia' },
  exerciseLogs: [
    {
      id: 'elog-1',
      status: 'completed',
      notes: null,
      exercise: { name: 'Remada Curvada', sets: 4, repetitions: 10, restInterval: 90 },
      setLogs: [],
    },
  ],
  ...overrides,
});

const makeStudentList = () => [
  { id: 'student-1', firstName: 'Neto', lastName: 'Santos', email: 'neto@example.com' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderPage = () =>
  renderWithRoute(<SessionDetail />, {
    route: '/trainer/students/student-1/sessions/session-1',
    path: '/trainer/students/:studentId/sessions/:sessionId',
  });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SessionDetail', () => {
  const mockShowToast = vi.fn();
  const mockStartConversation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ showToast: mockShowToast });
    useAiChat.mockReturnValue({ startConversation: mockStartConversation });
    api.get.mockImplementation((url) => {
      if (url.includes('workout-sessions/session-1')) {
        return Promise.resolve({ data: makeSession() });
      }
      if (url === '/trainer/students') {
        return Promise.resolve({ data: makeStudentList() });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders hero and notes grid after loading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-hero')).toBeInTheDocument();
    });
    expect(screen.getByTestId('notes-grid')).toBeInTheDocument();
  });

  it('renders training name in hero', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });
  });

  it('renders exercise cards', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('exercise-card-1')).toBeInTheDocument();
    });
    expect(screen.getByText('Remada Curvada')).toBeInTheDocument();
  });

  it('renders the exercises section heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Exercícios da sessão' })).toBeInTheDocument();
    });
  });

  it('does not render the exercises section when the session has no exercise logs', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('workout-sessions/session-1')) {
        return Promise.resolve({ data: makeSession({ exerciseLogs: [] }) });
      }
      return Promise.resolve({ data: makeStudentList() });
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-hero')).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Exercícios da sessão' })).not.toBeInTheDocument();
  });

  it('renders back button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voltar para o perfil do aluno/i })).toBeInTheDocument();
    });
  });

  it('navigates back to student on back button click', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voltar para o perfil do aluno/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /voltar para o perfil do aluno/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1');
  });

  it('shows 404 empty state when session not found', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('workout-sessions')) {
        return Promise.reject({ response: { status: 404 }, userMessage: 'Não encontrado' });
      }
      return Promise.resolve({ data: makeStudentList() });
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sessão não encontrada')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /voltar para o aluno/i })).toBeInTheDocument();
  });

  it('navigates back to the student from the not-found state', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url.includes('workout-sessions')) {
        return Promise.reject({ response: { status: 404 } });
      }
      return Promise.resolve({ data: makeStudentList() });
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: /voltar para o aluno/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1');
  });

  it('shows toast on unexpected API error', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('workout-sessions')) {
        return Promise.reject({ response: { status: 500 }, userMessage: 'Erro interno' });
      }
      return Promise.resolve({ data: [] });
    });
    renderPage();
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro interno', 'error');
    });
  });

  it('renders the trainer note panel from the notes grid', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-hero')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /editar anotação/i })).toBeInTheDocument();
  });

  it('navigates to ai-assistant and starts a new conversation scoped to the student', async () => {
    const user = userEvent.setup();
    mockStartConversation.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-hero')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /analisar com iarnold/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/ai-assistant');
    await waitFor(() => {
      expect(mockStartConversation).toHaveBeenCalledTimes(1);
    });
    const [prompt, options] = mockStartConversation.mock.calls[0];
    expect(options).toEqual({ studentId: 'student-1' });
    expect(prompt).toContain('Treino B');
    expect(prompt).toContain('Neto');
    expect(prompt).toMatch(/^analise/i);
  });
});
