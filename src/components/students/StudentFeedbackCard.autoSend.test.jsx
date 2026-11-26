import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import StudentFeedbackCard from './StudentFeedbackCard';

const DS = { Badge: 'badge' };
const STATIC_TEXT = 'Veja o que o aluno respondeu em cada envio e envie um feedback quando quiser.';

// Feedback of the history with the fields the card reads; overrides replace any of them
const buildFeedback = (overrides = {}) => ({
  id: 'fb-1',
  milestone: 'D7',
  milestoneLabel: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: '2026-11-02T12:00:00.000Z',
  submittedAt: '2026-11-03T12:00:00.000Z',
  overallIndex: 62,
  band: 'good',
  bandLabel: 'Bom',
  pillars: [],
  openAnswers: [],
  ...overrides,
});

const DAY_7 = buildFeedback({ overallIndex: 80 });
const DAY_15 = buildFeedback({ id: 'fb-2', milestone: 'D15', milestoneLabel: 'D15', submittedAt: '2026-11-11T12:00:00.000Z', overallIndex: 58, band: 'stable', bandLabel: 'Estável' });
const ADHOC_PENDING = buildFeedback({ id: 'fb-3', milestone: 'ADHOC', milestoneLabel: 'Avulso', status: 'pending', statusLabel: 'Pendente', submittedAt: null, overallIndex: null, band: null, bandLabel: null });

// History payload of the service; `autoSend` left undefined answers like the service before this feature
const buildHistory = ({ feedbacks = [], autoSend } = {}) => {
  const history = { student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null }, hasPending: false, feedbacks };
  if (autoSend !== undefined) history.autoSend = autoSend;
  return history;
};

const AUTO_ON = { enabled: true, next: { milestone: 'D30', milestoneLabel: 'D30', dueAt: '2026-11-26T12:00:00.000Z' } };
const AUTO_OFF = { enabled: false, next: null };

// Renders the card with the given history and returns its region
const renderCard = (history, onViewAll = vi.fn()) => {
  render(<StudentFeedbackCard onViewAll={onViewAll} history={history} />);
  return screen.getByRole('region', { name: 'Feedback' });
};

describe('StudentFeedbackCard: auto-send state', () => {
  it('shows "Envio automático ativo" in a success badge when the automatic sending is on', () => {
    const card = renderCard(buildHistory({ autoSend: AUTO_ON }));

    expect(within(card).getByText('Envio automático ativo')).toHaveClass(DS.Badge, 'badge--success');
    expect(within(card).queryByText('Envio automático desligado')).not.toBeInTheDocument();
  });

  it('shows "Envio automático desligado" in a neutral badge when the automatic sending is off', () => {
    const card = renderCard(buildHistory({ autoSend: AUTO_OFF }));

    expect(within(card).getByText('Envio automático desligado')).toHaveClass(DS.Badge, 'badge--neutral');
    expect(within(card).queryByText('Envio automático ativo')).not.toBeInTheDocument();
  });

  it('shows no auto-send badge when the service sends no autoSend, and still shows the last index', () => {
    const card = renderCard(buildHistory({ feedbacks: [DAY_7] }));

    expect(card).toHaveTextContent(/Último índice geral:\s*80 de 100/);
    expect(within(card).queryByText(/Envio automático/)).not.toBeInTheDocument();
  });
});

describe('StudentFeedbackCard: last overall index', () => {
  it('shows the overall index of the latest answered feedback as "58 de 100" with its band badge', () => {
    const card = renderCard(buildHistory({ feedbacks: [DAY_7, DAY_15], autoSend: AUTO_ON }));

    expect(card).toHaveTextContent(/Último índice geral:\s*58 de 100/);
    expect(within(card).getByText('Estável')).toHaveClass(DS.Badge, 'badge--warning');
    expect(card).not.toHaveTextContent(/80 de 100/);
    expect(within(card).queryByText('Bom')).not.toBeInTheDocument();
  });

  it('skips later feedbacks that were not answered', () => {
    const card = renderCard(buildHistory({ feedbacks: [DAY_7, DAY_15, ADHOC_PENDING], autoSend: AUTO_ON }));

    expect(card).toHaveTextContent(/Último índice geral:\s*58 de 100/);
  });

  it('shows no index when no feedback was answered yet, next to the auto-send badge', () => {
    const card = renderCard(buildHistory({ feedbacks: [ADHOC_PENDING], autoSend: AUTO_ON }));

    expect(within(card).getByText('Envio automático ativo')).toBeInTheDocument();
    expect(card).not.toHaveTextContent(/Último índice geral/);
    expect(card).not.toHaveTextContent(/de 100/);
  });

  it('keeps "Ver feedbacks" as the single action and calls onViewAll once when it is used', async () => {
    const onViewAll = vi.fn();
    const user = userEvent.setup();
    const card = renderCard(buildHistory({ feedbacks: [DAY_7, DAY_15], autoSend: AUTO_OFF }), onViewAll);

    expect(within(card).getByText('Envio automático desligado')).toBeInTheDocument();
    expect(within(card).getAllByRole('button')).toHaveLength(1);
    await user.click(within(card).getByRole('button', { name: 'Ver feedbacks' }));

    expect(onViewAll).toHaveBeenCalledTimes(1);
  });
});

describe('StudentFeedbackCard: without a history', () => {
  it('falls back to the static text, with no badge and no index, when the history is null', () => {
    const card = renderCard(null);

    expect(within(card).getByText(STATIC_TEXT)).toBeInTheDocument();
    expect(within(card).queryByText(/Envio automático/)).not.toBeInTheDocument();
    expect(card).not.toHaveTextContent(/de 100/);
    expect(within(card).getByRole('button', { name: 'Ver feedbacks' })).toBeEnabled();
  });

  it('falls back to the static text when no history is given at all', () => {
    render(<StudentFeedbackCard onViewAll={vi.fn()} />);

    const card = screen.getByRole('region', { name: 'Feedback' });
    expect(within(card).getByText(STATIC_TEXT)).toBeInTheDocument();
    expect(within(card).queryByText(/Envio automático/)).not.toBeInTheDocument();
  });
});
