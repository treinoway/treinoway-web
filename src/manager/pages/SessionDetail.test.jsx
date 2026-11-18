import { screen, waitFor, within, render } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SessionDetail from './SessionDetail';
import api from '../../api/axios';
import { t } from '../../i18n';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Builds a set log with defaults.
const setLog = (overrides) => ({
  id: 'sl',
  setNumber: 1,
  repetitions: 10,
  load: null,
  duration: null,
  rpe: null,
  restSeconds: null,
  completed: true,
  notes: null,
  ...overrides,
});

// Builds an exercise snapshot with defaults.
const exercise = (overrides) => ({
  id: 'e',
  name: 'Exercício',
  sets: 3,
  repetitions: 10,
  suggestedLoad: null,
  restInterval: null,
  prescriptionMode: 'repetitions',
  ...overrides,
});

const completedLog = {
  id: 'el1',
  order: 1,
  status: 'completed',
  notes: 'Boa execução',
  exercise: exercise({ id: 'e1', name: 'Supino reto', sets: 2, suggestedLoad: 80, restInterval: 90 }),
  substitutedByExerciseId: null,
  substitutedByExerciseName: null,
  setLogs: [
    setLog({ id: 'sl1', setNumber: 1, repetitions: 8, load: 80, rpe: 9, restSeconds: 90, completed: true, notes: 'Forte' }),
    setLog({ id: 'sl2', setNumber: 2, repetitions: 6, load: 82, rpe: null, restSeconds: null, completed: false }),
  ],
  previousLog: {
    workoutSessionId: 's0',
    finishedAt: '2026-09-30T12:00:00.000Z',
    setLogs: [
      { setNumber: 1, repetitions: 8, load: 75, duration: null },
      { setNumber: 2, repetitions: 7, load: 77, duration: null },
    ],
    bestSet: { setNumber: 1, repetitions: 8, load: 75, duration: null },
  },
};

const substitutedLog = {
  id: 'el2',
  order: 2,
  status: 'substituted',
  notes: null,
  exercise: exercise({ id: 'e2', name: 'Crucifixo' }),
  substitutedByExerciseId: 'e9',
  substitutedByExerciseName: 'Crucifixo no cabo',
  setLogs: [setLog({ id: 'sl3', setNumber: 1, repetitions: 12, load: 15 })],
  previousLog: null,
};

const skippedLog = {
  id: 'el3',
  order: 3,
  status: 'skipped',
  notes: 'Dor no ombro',
  exercise: exercise({ id: 'e3', name: 'Desenvolvimento' }),
  substitutedByExerciseId: null,
  substitutedByExerciseName: null,
  setLogs: [],
  previousLog: null,
};

const session = {
  id: 's1',
  status: 'completed',
  startedAt: '2026-10-06T12:00:00.000Z',
  finishedAt: '2026-10-06T13:00:00.000Z',
  durationSec: 3600,
  notes: 'Treino pesado',
  deletedAt: null,
  training: { id: 'tr1', name: 'Treino A - Peito' },
  student: { id: 'u2', firstName: 'Maria', lastName: 'Aluna', email: 'maria@example.com' },
  exerciseLogs: [completedLog, substitutedLog, skippedLog],
};

// Answers api.get only for the session detail URL.
const mockSession = (data) => {
  api.get.mockImplementation((url) =>
    url === '/admin/manager/sessions/s1'
      ? Promise.resolve({ data })
      : Promise.reject(new Error(`unexpected GET ${url}`))
  );
};

// Renders the page at /manager/sessions/s1 with a previous history entry to go back to.
const renderSession = () =>
  render(
    <MemoryRouter initialEntries={['/manager/users/u2', '/manager/sessions/s1']} initialIndex={1}>
      <Routes>
        <Route path="/manager/users/:userId" element={<div>User route</div>} />
        <Route path="/manager/sessions/:sessionId" element={<SessionDetail />} />
      </Routes>
    </MemoryRouter>
  );

// Waits for the page to load and returns the exercise cards in render order.
const findExerciseCards = async (container) => {
  await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' });
  return Array.from(container.querySelectorAll('section.section-card'));
};

describe('SessionDetail', () => {
  beforeEach(() => {
    api.get.mockReset();
    mockSession(session);
  });

  describe('loading and errors', () => {
    it('fetches /admin/manager/sessions/:id exactly once', async () => {
      renderSession();

      await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' });
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get.mock.calls[0][0]).toBe('/admin/manager/sessions/s1');
    });

    it('shows SkeletonRows labelled "Carregando sessão" while loading', () => {
      api.get.mockImplementation(() => new Promise(() => {}));

      const { container } = renderSession();

      const skeleton = screen.getByRole('status', { name: 'Carregando sessão' });
      expect(skeleton).toHaveClass('skeleton-rows');
      expect(container.querySelector('.skeleton-rows .row-skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    });

    it('shows an error Banner with error.userMessage when the request fails', async () => {
      api.get.mockRejectedValue({ userMessage: 'Sessão não encontrada' });

      const { container } = renderSession();

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveClass('ds-banner', 'ds-banner--error');
      expect(within(alert).getByText('Sessão não encontrada')).toBeInTheDocument();
      expect(container.querySelector('.skeleton-rows')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders the training name as h1 inside the manager-user-header', async () => {
      const { container } = renderSession();

      const heading = await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' });
      const header = container.querySelector('.manager-user-header');
      expect(header).toBeInTheDocument();
      expect(header).toContainElement(heading);
    });

    it('shows the student name, start/end dates, duration and session notes', async () => {
      const { container } = renderSession();
      await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' });
      const header = within(container.querySelector('.manager-user-header'));

      expect(header.getByText('Aluno: Maria Aluna')).toBeInTheDocument();
      expect(header.getByText(/^Início: 06\/10\/2026/)).toBeInTheDocument();
      expect(header.getByText(/^Fim: 06\/10\/2026/)).toBeInTheDocument();
      expect(header.getByText('Duração: 60 min')).toBeInTheDocument();
      expect(header.getByText('Observações: Treino pesado')).toBeInTheDocument();
    });

    it('falls back to the student email and dashes when names, end and duration are missing', async () => {
      mockSession({
        ...session,
        status: 'in_progress',
        finishedAt: null,
        durationSec: null,
        notes: null,
        student: { id: 'u2', firstName: null, lastName: null, email: 'maria@example.com' },
      });
      const { container } = renderSession();
      await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' });
      const header = within(container.querySelector('.manager-user-header'));

      expect(header.getByText('Aluno: maria@example.com')).toBeInTheDocument();
      expect(header.getByText('Fim: —')).toBeInTheDocument();
      expect(header.getByText('Duração: —')).toBeInTheDocument();
      expect(header.queryByText(/^Observações:/)).not.toBeInTheDocument();
    });

    it('shows the session status as a Badge in the header', async () => {
      const { container } = renderSession();
      await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' });
      const header = within(container.querySelector('.manager-user-header'));

      expect(header.getByText('Concluída')).toHaveClass('badge');
    });

    it('shows "Em andamento" as the status Badge of an in-progress session', async () => {
      mockSession({ ...session, status: 'in_progress', finishedAt: null });
      const { container } = renderSession();
      await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' });
      const header = within(container.querySelector('.manager-user-header'));

      expect(header.getByText('Em andamento')).toHaveClass('badge');
    });

    it('goes back in history with the ghost back button', async () => {
      const user = userEvent.setup();
      renderSession();
      await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' });
      const back = screen.getByRole('button', { name: 'Voltar' });
      expect(back).toHaveClass('btn', 'btn--ghost');

      await user.click(back);

      expect(await screen.findByText('User route')).toBeInTheDocument();
    });
  });

  describe('exercise cards', () => {
    it('renders one section-card per exercise log, in order, with the exercise name as heading', async () => {
      const { container } = renderSession();
      const cards = await findExerciseCards(container);

      expect(cards).toHaveLength(3);
      expect(cards[0]).toHaveClass('manager-training');
      expect(within(cards[0]).getByRole('heading', { level: 2, name: 'Supino reto' })).toBeInTheDocument();
      expect(within(cards[1]).getByRole('heading', { level: 2, name: 'Crucifixo' })).toBeInTheDocument();
      expect(within(cards[2]).getByRole('heading', { level: 2, name: 'Desenvolvimento' })).toBeInTheDocument();
    });

    it('shows each exercise status Badge (Concluído / Substituído / Pulado)', async () => {
      const { container } = renderSession();
      const cards = await findExerciseCards(container);

      expect(within(cards[0]).getByText('Concluído')).toHaveClass('badge');
      expect(cards[1].querySelector('.badge')).toHaveTextContent(/Substituído/);
      expect(within(cards[2]).getByText('Pulado')).toHaveClass('badge');
    });

    it('shows "Substituído por <name>" on a substituted exercise', async () => {
      const { container } = renderSession();
      const cards = await findExerciseCards(container);

      expect(within(cards[1]).getByText('Substituído por Crucifixo no cabo')).toBeInTheDocument();
      expect(within(cards[0]).queryByText(/Substituído por/)).not.toBeInTheDocument();
    });

    it('shows the exercise notes', async () => {
      const { container } = renderSession();
      const cards = await findExerciseCards(container);

      expect(within(cards[0]).getByText('Boa execução')).toBeInTheDocument();
      expect(within(cards[2]).getByText('Dor no ombro')).toBeInTheDocument();
    });

    it('lists the logged sets in an admin-table with Série, Carga, Reps, RPE, Descanso, Status and Obs. columns', async () => {
      const { container } = renderSession();
      const cards = await findExerciseCards(container);
      const table = cards[0].querySelector('table.admin-table');
      expect(table).toBeInTheDocument();

      const headers = within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent);
      expect(headers).toEqual(['Série', 'Carga', 'Reps', 'RPE', 'Descanso', 'Status', 'Obs.']);
    });

    it('renders one row per set with load, reps, RPE, rest, status Badge and notes', async () => {
      const { container } = renderSession();
      const cards = await findExerciseCards(container);
      const table = cards[0].querySelector('table.admin-table');
      const [, firstSet, secondSet] = within(table).getAllByRole('row');

      const firstCells = within(firstSet).getAllByRole('cell').map((cell) => cell.textContent);
      expect(firstCells).toEqual(['1', '80 kg', '8', '9', '90s', 'Concluída', 'Forte']);
      expect(within(firstSet).getByText('Concluída')).toHaveClass('badge');

      const secondCells = within(secondSet).getAllByRole('cell').map((cell) => cell.textContent);
      expect(secondCells).toEqual(['2', '82 kg', '6', '—', '—', 'Não concluída', '—']);
      expect(within(secondSet).getByText('Não concluída')).toHaveClass('badge');
    });

    it('shows "Nenhuma série registrada" and no sets table for an exercise without sets', async () => {
      const { container } = renderSession();
      const cards = await findExerciseCards(container);

      expect(within(cards[2]).getByText('Nenhuma série registrada')).toBeInTheDocument();
      expect(cards[2].querySelector('table.admin-table')).not.toBeInTheDocument();
      expect(within(cards[0]).queryByText('Nenhuma série registrada')).not.toBeInTheDocument();
    });

    it('renders nothing editable', async () => {
      renderSession();
      await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' });

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });
  });

  describe('previous session', () => {
    it('shows "Sessão anterior — dd/mm/aaaa" with the previous sets in an admin-table', async () => {
      const { container } = renderSession();
      const cards = await findExerciseCards(container);

      expect(within(cards[0]).getByText('Sessão anterior — 30/09/2026')).toBeInTheDocument();
      const tables = cards[0].querySelectorAll('table.admin-table');
      expect(tables).toHaveLength(2);
      const previousTable = tables[1];
      const headers = within(previousTable)
        .getAllByRole('columnheader')
        .map((header) => header.textContent);
      expect(headers).toEqual(['Série', 'Carga', 'Reps']);
      const [, firstPrevious, secondPrevious] = within(previousTable).getAllByRole('row');
      expect(within(firstPrevious).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['1', '75 kg', '8']);
      expect(within(secondPrevious).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['2', '77 kg', '7']);
    });

    it('shows the previous best set as "Melhor série: <load> kg × <reps>"', async () => {
      const { container } = renderSession();
      const cards = await findExerciseCards(container);

      expect(within(cards[0]).getByText('Melhor série: 75 kg × 8')).toBeInTheDocument();
    });

    it('shows "Sem registro anterior" when previousLog is null', async () => {
      const { container } = renderSession();
      const cards = await findExerciseCards(container);

      expect(within(cards[1]).getByText('Sem registro anterior')).toBeInTheDocument();
      expect(within(cards[2]).getByText('Sem registro anterior')).toBeInTheDocument();
      expect(within(cards[0]).queryByText('Sem registro anterior')).not.toBeInTheDocument();
      expect(within(cards[1]).queryByText(/^Sessão anterior/)).not.toBeInTheDocument();
    });
  });

  describe('empty session', () => {
    it('renders the header and no exercise cards when the session has no exercise logs', async () => {
      mockSession({ ...session, exerciseLogs: [] });
      const { container } = renderSession();

      await screen.findByRole('heading', { level: 1, name: 'Treino A - Peito' });
      await waitFor(() => expect(container.querySelectorAll('section.section-card')).toHaveLength(0));
    });
  });

  describe('i18n', () => {
    it('defines the session copy under manager.session in pt-BR', () => {
      expect(t('manager.session.loading')).toBe('Carregando sessão');
      expect(t('manager.session.student')).toBe('Aluno: {name}');
      expect(t('manager.session.startedAt')).toBe('Início: {date}');
      expect(t('manager.session.finishedAt')).toBe('Fim: {date}');
      expect(t('manager.session.duration')).toBe('Duração: {duration}');
      expect(t('manager.session.notes')).toBe('Observações: {notes}');
      expect(t('manager.session.status.completed')).toBe('Concluída');
      expect(t('manager.session.status.in_progress')).toBe('Em andamento');
      expect(t('manager.session.exerciseStatus.completed')).toBe('Concluído');
      expect(t('manager.session.exerciseStatus.skipped')).toBe('Pulado');
      expect(t('manager.session.exerciseStatus.substituted')).toBe('Substituído');
      expect(t('manager.session.exerciseStatus.pending')).toBe('Pendente');
      expect(t('manager.session.substitutedBy')).toBe('Substituído por {name}');
      expect(t('manager.session.setsEmpty')).toBe('Nenhuma série registrada');
      expect(t('manager.session.colSet')).toBe('Série');
      expect(t('manager.session.colLoad')).toBe('Carga');
      expect(t('manager.session.colReps')).toBe('Reps');
      expect(t('manager.session.colRpe')).toBe('RPE');
      expect(t('manager.session.colRest')).toBe('Descanso');
      expect(t('manager.session.colStatus')).toBe('Status');
      expect(t('manager.session.colNotes')).toBe('Obs.');
      expect(t('manager.session.setStatus.completed')).toBe('Concluída');
      expect(t('manager.session.setStatus.incomplete')).toBe('Não concluída');
      expect(t('manager.session.previousTitle')).toBe('Sessão anterior — {date}');
      expect(t('manager.session.previousEmpty')).toBe('Sem registro anterior');
      expect(t('manager.session.bestSet')).toBe('Melhor série: {load} × {reps}');
    });
  });
});
