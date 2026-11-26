import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import FeedbackTimeline from './FeedbackTimeline';

// An instant of November 2026 in the local time of the machine, as the ISO string the service sends
const localIso = (day, hour = 12, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();

const NOW = new Date(2026, 10, 24, 10, 0);

// Feedback waiting for the answer of the student; overrides replace any field
const buildPending = (overrides = {}) => ({
  id: 'fb-4',
  milestone: 'ADHOC',
  milestoneLabel: 'Avulso',
  status: 'pending',
  statusLabel: 'Pendente',
  sentAt: localIso(24, 9),
  expiresAt: localIso(27, 9),
  submittedAt: null,
  overallIndex: null,
  band: null,
  bandLabel: null,
  ...overrides,
});

const ANSWERED = buildPending({
  id: 'fb-1',
  milestone: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: localIso(10, 9),
  submittedAt: localIso(11, 9),
  expiresAt: localIso(27, 9),
  overallIndex: 55,
  band: 'stable',
  bandLabel: 'Estável',
});
const EXPIRED = buildPending({ id: 'fb-2', milestone: 'D15', status: 'expired', statusLabel: 'Expirado', sentAt: localIso(17, 9), expiresAt: localIso(27, 9) });
const NEXT_D30 = { milestone: 'D30', milestoneLabel: 'D30', dueAt: localIso(26, 9) };

// Renders the timeline and returns its items, in the order shown
const renderItems = (feedbacks, next) => {
  render(<FeedbackTimeline feedbacks={feedbacks} next={next} />);
  return within(screen.getByRole('list', { name: 'Linha do tempo dos feedbacks' })).getAllByRole('listitem');
};

describe('FeedbackTimeline: deadline of the pending feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('says in how many days the pending feedback expires, next to "Aguardando resposta"', () => {
    const [pending] = renderItems([buildPending()]);

    expect(within(pending).getByText('Aguardando resposta')).toBeInTheDocument();
    expect(within(pending).getByText('Expira em 3 dias')).toBeInTheDocument();
  });

  it('follows the response window of the send: a deadline 7 days ahead reads "Expira em 7 dias"', () => {
    const [pending] = renderItems([buildPending({ expiresAt: new Date(2026, 11, 1, 9, 0).toISOString() })]);

    expect(within(pending).getByText('Expira em 7 dias')).toBeInTheDocument();
  });

  it('says "Expira amanhã" when the deadline is on the next day', () => {
    const [pending] = renderItems([buildPending({ expiresAt: localIso(25, 9) })]);

    expect(within(pending).getByText('Expira amanhã')).toBeInTheDocument();
    expect(within(pending).queryByText(/^Expira em/)).not.toBeInTheDocument();
  });

  it('says "Expira hoje" when the deadline is later on the same day', () => {
    const [pending] = renderItems([buildPending({ expiresAt: localIso(24, 18) })]);

    expect(within(pending).getByText('Expira hoje')).toBeInTheDocument();
  });

  it('shows no deadline once it has passed, keeping "Aguardando resposta"', () => {
    const [pending] = renderItems([buildPending({ expiresAt: localIso(24, 9, 30) })]);

    expect(within(pending).getByText('Aguardando resposta')).toBeInTheDocument();
    expect(pending).not.toHaveTextContent('Expira');
  });

  it.each([[null], [undefined], ['not a date']])('shows no deadline and no broken text when the deadline is %j', (expiresAt) => {
    const [pending] = renderItems([buildPending({ expiresAt })]);

    expect(within(pending).getByText('Aguardando resposta')).toBeInTheDocument();
    expect(pending).not.toHaveTextContent(/Expira|Invalid Date|NaN|null|undefined/);
  });

  it('shows the deadline only on the pending item, never on answered, expired or upcoming ones', () => {
    const [answered, expired, pending, upcoming] = renderItems([ANSWERED, EXPIRED, buildPending()], NEXT_D30);

    expect(within(pending).getByText('Expira em 3 dias')).toBeInTheDocument();
    expect(answered).not.toHaveTextContent('Expira');
    expect(within(expired).getByText('Expirou sem resposta')).toBeInTheDocument();
    expect(expired).not.toHaveTextContent(/Expira (hoje|amanhã|em)/);
    expect(upcoming).not.toHaveTextContent('Expira');
    expect(screen.getAllByText(/^Expira (hoje|amanhã|em \d+ dias)$/)).toHaveLength(1);
  });

  it('keeps the send date of the pending item above the deadline', () => {
    const [pending] = renderItems([buildPending()]);

    expect(within(pending).getByText(/^Enviado em 24\/11(\/2026)?$/)).toBeInTheDocument();
    expect(within(pending).getByText('Envio manual')).toBeInTheDocument();
  });
});
