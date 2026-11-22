import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import FeedbackTimeline from './FeedbackTimeline';

// Feedback of the history with the fields the timeline reads; overrides replace any of them
const buildFeedback = (overrides = {}) => ({
  id: 'fb-1',
  milestone: 'D7',
  milestoneLabel: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: '2026-10-20T12:00:00.000Z',
  overallIndex: 55,
  band: 'stable',
  bandLabel: 'Estável',
  ...overrides,
});

const DAY_7 = buildFeedback();
const DAY_15_EXPIRED = buildFeedback({ id: 'fb-2', milestone: 'D15', milestoneLabel: 'D15', status: 'expired', statusLabel: 'Expirado', sentAt: '2026-10-28T12:00:00.000Z', overallIndex: null, band: null, bandLabel: null });
const ADHOC_PENDING = buildFeedback({ id: 'fb-3', milestone: 'ADHOC', milestoneLabel: 'Avulso', status: 'pending', statusLabel: 'Pendente', sentAt: '2026-11-03T12:00:00.000Z', overallIndex: null, band: null, bandLabel: null });

// Items of the timeline list, in the order shown
const timelineItems = () => within(screen.getByRole('list', { name: 'Linha do tempo dos feedbacks' })).queryAllByRole('listitem');

describe('FeedbackTimeline', () => {
  it('is a section named "Linha do tempo" with a level 2 heading', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7]} />);

    const section = screen.getByRole('region', { name: 'Linha do tempo' });
    expect(within(section).getByRole('heading', { level: 2, name: 'Linha do tempo' })).toBeInTheDocument();
  });

  it('shows one item per feedback in the order received', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7, DAY_15_EXPIRED, ADHOC_PENDING]} />);

    const items = timelineItems();
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('7 dias')).toBeInTheDocument();
    expect(within(items[1]).getByText('15 dias')).toBeInTheDocument();
    expect(within(items[2]).getByText('Envio manual')).toBeInTheDocument();
  });

  it('names each milestone with the web label, not the label the service sent', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7, ADHOC_PENDING]} />);

    const [day7, adhoc] = timelineItems();
    expect(within(day7).getByText('7 dias')).toBeInTheDocument();
    expect(within(day7).queryByText('D7')).not.toBeInTheDocument();
    expect(within(adhoc).getByText('Envio manual')).toBeInTheDocument();
    expect(within(adhoc).queryByText('Avulso')).not.toBeInTheDocument();
  });

  it('shows the label the service sent for a milestone the app does not know', () => {
    render(<FeedbackTimeline feedbacks={[buildFeedback({ milestone: 'D60', milestoneLabel: '60 dias' })]} />);

    expect(within(timelineItems()[0]).getByText('60 dias')).toBeInTheDocument();
  });

  it('shows the send date of each feedback in pt-BR', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7, DAY_15_EXPIRED]} />);

    const items = timelineItems();
    expect(within(items[0]).getByText('Enviado em 20/10/2026')).toBeInTheDocument();
    expect(within(items[1]).getByText('Enviado em 28/10/2026')).toBeInTheDocument();
  });

  it('shows a dash instead of "Invalid Date" when the send date is missing or unreadable', () => {
    render(<FeedbackTimeline feedbacks={[buildFeedback({ sentAt: null }), buildFeedback({ id: 'fb-2', sentAt: 'not-a-date' })]} />);

    expect(screen.getAllByText('Enviado em -')).toHaveLength(2);
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  it('shows the index with the band badge on an answered feedback', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7]} />);

    const [item] = timelineItems();
    expect(within(item).getByText('55')).toBeInTheDocument();
    expect(within(item).getByText('Estável')).toHaveClass('badge', 'badge--warning');
    expect(within(item).queryByText('Respondido')).not.toBeInTheDocument();
  });

  it('shows a dash and the status badge on a feedback that was not answered', () => {
    render(<FeedbackTimeline feedbacks={[DAY_15_EXPIRED, ADHOC_PENDING]} />);

    const [expired, pending] = timelineItems();
    expect(within(expired).getByText('-')).toBeInTheDocument();
    expect(within(expired).getByText('Expirado')).toHaveClass('badge', 'badge--neutral');
    expect(within(pending).getByText('Pendente')).toHaveClass('badge', 'badge--neutral');
  });

  it('keeps the section with an empty list when there is no feedback', () => {
    render(<FeedbackTimeline feedbacks={[]} />);

    expect(screen.getByRole('region', { name: 'Linha do tempo' })).toBeInTheDocument();
    expect(timelineItems()).toHaveLength(0);
  });
});
