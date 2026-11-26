import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import FeedbackTimeline from './FeedbackTimeline';

const DS = { Timeline: 'timeline', Badge: 'badge' };

// Feedback of the history with the fields the timeline reads; overrides replace any of them
const buildFeedback = (overrides = {}) => ({
  id: 'fb-1',
  milestone: 'D7',
  milestoneLabel: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: '2026-10-20T12:00:00.000Z',
  submittedAt: '2026-10-21T12:00:00.000Z',
  overallIndex: 55,
  band: 'stable',
  bandLabel: 'Estável',
  ...overrides,
});

// Feedback the student did not answer, in the given status
const buildUnanswered = (overrides) => buildFeedback({ submittedAt: null, overallIndex: null, band: null, bandLabel: null, ...overrides });

const DAY_7 = buildFeedback();
const DAY_15_EXPIRED = buildUnanswered({ id: 'fb-2', milestone: 'D15', milestoneLabel: 'D15', status: 'expired', statusLabel: 'Expirado', sentAt: '2026-10-28T12:00:00.000Z' });
const DAY_21 = buildFeedback({ id: 'fb-3', milestone: 'D21', milestoneLabel: 'D21', sentAt: '2026-11-03T12:00:00.000Z', submittedAt: '2026-11-04T12:00:00.000Z', overallIndex: 77, band: 'good', bandLabel: 'Bom' });
const ADHOC_PENDING = buildUnanswered({ id: 'fb-4', milestone: 'ADHOC', milestoneLabel: 'Avulso', status: 'pending', statusLabel: 'Pendente', sentAt: '2026-11-10T12:00:00.000Z' });
const NEXT_D30 = { milestone: 'D30', milestoneLabel: 'D30', dueAt: '2026-11-26T12:00:00.000Z' };

// Text made of a prefix and a day/month of 2026, shown with or without the year
const dated = (prefix, dayMonth) => new RegExp(`^${prefix} ${dayMonth}(/2026)?$`);

// Items of the timeline list, in the order shown
const timelineItems = () => within(screen.getByRole('list', { name: 'Linha do tempo dos feedbacks' })).queryAllByRole('listitem');

describe('FeedbackTimeline', () => {
  it('is a section named "Linha do tempo" with a level 2 heading, drawn with the DS Timeline', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7]} />);

    const section = screen.getByRole('region', { name: 'Linha do tempo' });
    expect(within(section).getByRole('heading', { level: 2, name: 'Linha do tempo' })).toBeInTheDocument();
    expect(within(section).getByRole('list', { name: 'Linha do tempo dos feedbacks' })).toHaveClass(DS.Timeline);
  });

  it('shows one item per feedback in the order received, each with the state of its send', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7, DAY_15_EXPIRED, ADHOC_PENDING]} />);

    const items = timelineItems();
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('7 dias')).toBeInTheDocument();
    expect(items[0]).toHaveClass('timeline__item--answered');
    expect(within(items[1]).getByText('15 dias')).toBeInTheDocument();
    expect(items[1]).toHaveClass('timeline__item--expired');
    expect(within(items[2]).getByText('Envio manual')).toBeInTheDocument();
    expect(items[2]).toHaveClass('timeline__item--pending');
  });

  it('names each milestone with the web label, not the label the service sent', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7, ADHOC_PENDING]} />);

    const [day7, adhoc] = timelineItems();
    expect(day7).toHaveClass('timeline__item--answered');
    expect(within(day7).getByText('7 dias')).toBeInTheDocument();
    expect(within(day7).queryByText('D7')).not.toBeInTheDocument();
    expect(within(adhoc).getByText('Envio manual')).toBeInTheDocument();
    expect(within(adhoc).queryByText('Avulso')).not.toBeInTheDocument();
  });

  it('shows the label the service sent for a milestone the app does not know', () => {
    render(<FeedbackTimeline feedbacks={[buildFeedback({ milestone: 'D60', milestoneLabel: '60 dias' })]} />);

    const [item] = timelineItems();
    expect(item).toHaveClass('timeline__item--answered');
    expect(within(item).getByText('60 dias')).toBeInTheDocument();
  });

  it('shows an answered feedback with the date it was answered, the index and the band badge', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7]} />);

    const [item] = timelineItems();
    expect(within(item).getByText(dated('Respondido em', '21/10'))).toBeInTheDocument();
    expect(within(item).queryByText(/Enviado em/)).not.toBeInTheDocument();
    expect(within(item).getByText('55')).toBeInTheDocument();
    expect(within(item).getByText('Estável')).toHaveClass(DS.Badge, 'badge--warning');
    expect(within(item).queryByText('Respondido')).not.toBeInTheDocument();
  });

  it('shows no variation on the first answered feedback', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7, DAY_21]} />);

    const [first] = timelineItems();
    expect(first).toHaveClass('timeline__item--answered');
    expect(within(first).queryByText(/^([+−]\d+|0)$/)).not.toBeInTheDocument();
  });

  it('shows the variation against the previous answered feedback as a badge, skipping the unanswered in between', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7, DAY_15_EXPIRED, DAY_21]} />);

    const third = timelineItems()[2];
    expect(within(third).getByText('77')).toBeInTheDocument();
    expect(within(third).getByText('Bom')).toHaveClass(DS.Badge, 'badge--success');
    expect(within(third).getByText('+22')).toHaveClass(DS.Badge, 'badge--success');
  });

  it('shows a loss with the typographic minus in an error badge and no change as "0" in a neutral badge', () => {
    const lower = buildFeedback({ id: 'fb-5', milestone: 'D15', milestoneLabel: 'D15', overallIndex: 45, band: 'attention', bandLabel: 'Atenção' });
    const same = buildFeedback({ id: 'fb-6', milestone: 'D21', milestoneLabel: 'D21', overallIndex: 45, band: 'attention', bandLabel: 'Atenção' });
    render(<FeedbackTimeline feedbacks={[DAY_7, lower, same]} />);

    const items = timelineItems();
    expect(within(items[1]).getByText('−10')).toHaveClass(DS.Badge, 'badge--error');
    expect(within(items[1]).getByText('Atenção')).toHaveClass(DS.Badge, 'badge--error');
    expect(within(items[2]).getByText('0')).toHaveClass(DS.Badge, 'badge--neutral');
  });

  it('shows an expired feedback with the send date and "Expirou sem resposta" in a neutral badge', () => {
    render(<FeedbackTimeline feedbacks={[DAY_15_EXPIRED]} />);

    const [expired] = timelineItems();
    expect(within(expired).getByText(dated('Enviado em', '28/10'))).toBeInTheDocument();
    expect(within(expired).getByText('Expirou sem resposta')).toHaveClass(DS.Badge, 'badge--neutral');
    expect(within(expired).queryByText('Expirado')).not.toBeInTheDocument();
  });

  it('shows a pending feedback with the send date and "Aguardando resposta" in a brand badge', () => {
    render(<FeedbackTimeline feedbacks={[ADHOC_PENDING]} />);

    const [pending] = timelineItems();
    expect(within(pending).getByText(dated('Enviado em', '10/11'))).toBeInTheDocument();
    expect(within(pending).getByText('Aguardando resposta')).toHaveClass(DS.Badge, 'badge--brand');
    expect(within(pending).queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('shows a dash instead of "Invalid Date" when a date is missing or unreadable', () => {
    render(<FeedbackTimeline feedbacks={[buildFeedback({ submittedAt: null }), buildUnanswered({ id: 'fb-2', status: 'expired', sentAt: 'not-a-date' })]} />);

    const [answered, expired] = timelineItems();
    expect(within(answered).getByText('Respondido em -')).toBeInTheDocument();
    expect(within(expired).getByText('Enviado em -')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  it('closes with the next scheduled milestone as an upcoming item when `next` is given', () => {
    render(<FeedbackTimeline feedbacks={[DAY_7, ADHOC_PENDING]} next={NEXT_D30} />);

    const items = timelineItems();
    expect(items).toHaveLength(3);
    expect(items[2]).toHaveClass('timeline__item--upcoming');
    expect(within(items[2]).getByText('30 dias')).toBeInTheDocument();
    expect(within(items[2]).getByText(dated('Agendado para', '26/11'))).toBeInTheDocument();
    expect(within(items[2]).getByText('Próximo envio')).toBeInTheDocument();
  });

  it('adds no upcoming item when `next` is null or left out', () => {
    const { unmount } = render(<FeedbackTimeline feedbacks={[DAY_7]} next={null} />);
    expect(timelineItems()).toHaveLength(1);
    expect(timelineItems()[0]).toHaveClass('timeline__item--answered');
    expect(screen.queryByText('Próximo envio')).not.toBeInTheDocument();
    unmount();

    render(<FeedbackTimeline feedbacks={[DAY_7]} />);
    expect(timelineItems()).toHaveLength(1);
    expect(screen.queryByText('Próximo envio')).not.toBeInTheDocument();
  });
});
