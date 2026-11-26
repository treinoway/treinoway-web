import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, within } from '../../test/test-utils';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast: vi.fn() }),
}));

import api from '../../api/axios';
import FeedbackComparison from './FeedbackComparison';
import StudentFeedbackHistory from '../../pages/trainer/StudentFeedbackHistory';

const HISTORY_URL = '/trainer/students/student-1/feedbacks';
const SECTION = { name: 'Evolução por envio' };
const TABLE = { name: 'Pilares por envio' };

// Answered feedback of the history with the fields of the trainer API; overrides replace any of them
const buildFeedback = (overrides = {}) => ({
  id: 'fb-1',
  milestone: 'D7',
  milestoneLabel: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: '2026-11-02T12:00:00.000Z',
  expiresAt: '2026-11-05T12:00:00.000Z',
  submittedAt: '2026-11-03T12:00:00.000Z',
  readAt: '2026-11-03T18:00:00.000Z',
  overallIndex: 62,
  band: 'stable',
  bandLabel: 'Estável',
  pillars: [{ pillar: 'sleep', pillarLabel: 'Sono', score: 50, band: 'stable', bandLabel: 'Estável', answers: [] }],
  openAnswers: [],
  ...overrides,
});

const DAY_7 = buildFeedback();
const DAY_15 = buildFeedback({
  id: 'fb-2',
  milestone: 'D15',
  milestoneLabel: 'D15',
  sentAt: '2026-11-10T12:00:00.000Z',
  submittedAt: '2026-11-11T12:00:00.000Z',
  overallIndex: 58,
  pillars: [{ pillar: 'sleep', pillarLabel: 'Sono', score: 25, band: 'attention', bandLabel: 'Atenção', answers: [] }],
});
const DAY_21 = buildFeedback({
  id: 'fb-3',
  milestone: 'D21',
  milestoneLabel: 'D21',
  sentAt: '2026-11-17T12:00:00.000Z',
  submittedAt: '2026-11-18T12:00:00.000Z',
  overallIndex: 80,
  band: 'good',
  bandLabel: 'Bom',
  pillars: [{ pillar: 'sleep', pillarLabel: 'Sono', score: 75, band: 'good', bandLabel: 'Bom', answers: [] }],
});
const DAY_21_EXPIRED = buildFeedback({ id: 'fb-3', milestone: 'D21', status: 'expired', statusLabel: 'Expirado', submittedAt: null, readAt: null, overallIndex: null, band: null, bandLabel: null, pillars: [] });
const ADHOC_PENDING = buildFeedback({ id: 'fb-4', milestone: 'ADHOC', status: 'pending', statusLabel: 'Pendente', submittedAt: null, readAt: null, overallIndex: null, band: null, bandLabel: null, pillars: [] });

// Renders the history page of student-1 answered with the given feedbacks and waits for its title
const renderHistory = async (feedbacks) => {
  const data = {
    student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null },
    hasPending: feedbacks.some((feedback) => feedback.status === 'pending'),
    feedbacks,
    autoSend: { enabled: false, next: null },
  };
  api.get.mockImplementation((url) => (url === HISTORY_URL ? Promise.resolve({ data }) : Promise.reject(new Error(`unexpected GET ${url}`))));
  render(
    <MemoryRouter initialEntries={[HISTORY_URL]}>
      <Routes>
        <Route path="/trainer/students/:id/feedbacks" element={<StudentFeedbackHistory />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Feedback de Ana Souza' });
};

describe('FeedbackComparison', () => {
  it('is a section named "Evolução por envio" with a level 2 heading', () => {
    render(<FeedbackComparison answered={[DAY_7, DAY_15]} />);

    const section = screen.getByRole('region', SECTION);
    expect(within(section).getByRole('heading', { level: 2, name: 'Evolução por envio' })).toBeInTheDocument();
  });

  it('keeps the table of pillars under its accessible name "Pilares por envio"', () => {
    render(<FeedbackComparison answered={[DAY_7, DAY_15]} />);

    expect(within(screen.getByRole('region', SECTION)).getByRole('table', TABLE)).toBeInTheDocument();
  });

  it('has one column per answered feedback, named by its milestone, after the pillar column', () => {
    render(<FeedbackComparison answered={[DAY_7, DAY_15, DAY_21]} />);

    const headers = within(screen.getByRole('table', TABLE)).getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
    expect(headers[0]).toHaveTextContent('Pilar');
    expect(headers[1]).toHaveTextContent('7 dias');
    expect(headers[2]).toHaveTextContent('15 dias');
    expect(headers[3]).toHaveTextContent('21 dias');
  });

  it('shows the score of each pillar per send and closes with the overall index', () => {
    render(<FeedbackComparison answered={[DAY_7, DAY_15]} />);

    const table = screen.getByRole('table', TABLE);
    const sleep = within(table).getByRole('row', { name: /^Sono/ });
    expect(sleep).toHaveTextContent('50');
    expect(sleep).toHaveTextContent('25');
    const overall = within(table).getByRole('row', { name: /^Índice geral/ });
    expect(overall).toHaveTextContent('62');
    expect(overall).toHaveTextContent('58');
  });
});

describe('FeedbackComparison: on the history page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is rendered below the latest result with two answered feedbacks', async () => {
    await renderHistory([DAY_7, DAY_15]);

    const latest = screen.getByRole('region', { name: 'Último feedback respondido' });
    const comparison = screen.getByRole('region', SECTION);
    expect(within(comparison).getByRole('table', TABLE)).toBeInTheDocument();
    expect(latest.compareDocumentPosition(comparison) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('is rendered with three answered feedbacks, one column each', async () => {
    await renderHistory([DAY_7, DAY_15, DAY_21]);

    expect(within(screen.getByRole('table', TABLE)).getAllByRole('columnheader')).toHaveLength(4);
  });

  it('is not rendered with a single answered feedback, while the latest result is', async () => {
    await renderHistory([DAY_7]);

    expect(screen.getByRole('region', { name: 'Último feedback respondido' })).toBeInTheDocument();
    expect(screen.queryByRole('region', SECTION)).not.toBeInTheDocument();
    expect(screen.queryByRole('table', TABLE)).not.toBeInTheDocument();
  });

  it('does not count expired and pending feedbacks: one answered among three sends renders no table', async () => {
    await renderHistory([DAY_7, DAY_21_EXPIRED, ADHOC_PENDING]);

    expect(screen.queryByRole('region', SECTION)).not.toBeInTheDocument();
    expect(screen.queryByRole('table', TABLE)).not.toBeInTheDocument();
  });

  it('is not rendered when no feedback was answered', async () => {
    await renderHistory([DAY_21_EXPIRED, ADHOC_PENDING]);

    expect(screen.queryByRole('region', SECTION)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Último feedback respondido' })).not.toBeInTheDocument();
  });

  it('leaves the unanswered sends out of the columns', async () => {
    await renderHistory([DAY_7, DAY_21_EXPIRED, DAY_15, ADHOC_PENDING]);

    expect(within(screen.getByRole('table', TABLE)).getAllByRole('columnheader')).toHaveLength(3);
  });
});
