import { screen, render } from '../../test/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SessionDetail from './SessionDetail';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Builds a session whose only exercise has a previous log finished at `finishedAt`.
const buildSession = (finishedAt) => ({
  id: 's1',
  status: 'completed',
  startedAt: '2026-10-06T12:00:00.000Z',
  finishedAt: '2026-10-06T13:00:00.000Z',
  durationSec: 3600,
  notes: null,
  deletedAt: null,
  training: { id: 'tr1', name: 'Treino A - Peito' },
  student: { id: 'u2', firstName: 'Maria', lastName: 'Aluna', email: 'maria@example.com' },
  exerciseLogs: [
    {
      id: 'el1',
      order: 1,
      status: 'completed',
      notes: null,
      exercise: {
        id: 'e1',
        name: 'Supino reto',
        sets: 1,
        repetitions: 10,
        suggestedLoad: null,
        restInterval: null,
        prescriptionMode: 'repetitions',
      },
      substitutedByExerciseId: null,
      substitutedByExerciseName: null,
      setLogs: [],
      previousLog: {
        workoutSessionId: 's0',
        finishedAt,
        setLogs: [{ setNumber: 1, repetitions: 8, load: 75, duration: null }],
        bestSet: { setNumber: 1, repetitions: 8, load: 75, duration: null },
      },
    },
  ],
});

// Answers api.get only for the session detail URL.
const mockSession = (data) => {
  api.get.mockImplementation((url) =>
    url === '/admin/manager/sessions/s1'
      ? Promise.resolve({ data })
      : Promise.reject(new Error(`unexpected GET ${url}`))
  );
};

// Renders the page at /manager/sessions/s1.
const renderSession = () =>
  render(
    <MemoryRouter initialEntries={['/manager/sessions/s1']}>
      <Routes>
        <Route path="/manager/sessions/:sessionId" element={<SessionDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('SessionDetail previous log date', () => {
  const originalTimezone = process.env.TZ;

  beforeEach(() => {
    api.get.mockReset();
  });

  afterEach(() => {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  });

  it('titles the previous session with the viewer local date behind UTC (America/Sao_Paulo)', async () => {
    process.env.TZ = 'America/Sao_Paulo';
    // why: 01:30 UTC on 01/10 is still the evening of 30/09 in UTC-3.
    mockSession(buildSession('2026-10-01T01:30:00.000Z'));

    renderSession();

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Sessão anterior — 30/09/2026' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Sessão anterior — 01/10/2026')).not.toBeInTheDocument();
  });

  it('titles the previous session with the viewer local date ahead of UTC (Asia/Tokyo)', async () => {
    process.env.TZ = 'Asia/Tokyo';
    // why: 20:00 UTC on 30/09 is already the morning of 01/10 in UTC+9.
    mockSession(buildSession('2026-09-30T20:00:00.000Z'));

    renderSession();

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Sessão anterior — 01/10/2026' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Sessão anterior — 30/09/2026')).not.toBeInTheDocument();
  });
});
