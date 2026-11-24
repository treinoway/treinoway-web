import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import OpenAnswers from './OpenAnswers';

// Open answer with the fields of the trainer API
const openAnswer = (questionId, question, text) => ({ questionId, question, pillar: 'report', pillarLabel: 'Relato', text });

// Answered feedback of the given milestone day, submitted on that day of November 2026, with the given open answers
const answered = (day, openAnswers) => ({
  id: `fb-${day}`,
  milestone: `D${day}`,
  milestoneLabel: `D${day}`,
  status: 'answered',
  submittedAt: `2026-11-${String(day).padStart(2, '0')}T12:00:00.000Z`,
  openAnswers,
});

const DAY_7 = answered(7, [openAnswer('q-8', 'Quer contar mais alguma coisa?', 'Dormi mal por causa do trabalho.')]);
const DAY_15_SILENT = answered(15, []);
const DAY_21 = answered(21, [
  openAnswer('q-7', 'O que mais atrapalhou a rotina?', 'Viagem a trabalho.'),
  openAnswer('q-8', 'Quer contar mais alguma coisa?', 'Semana ótima, consegui treinar tudo.'),
]);

// Whether `first` comes before `second` in the document
const comesBefore = (first, second) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('OpenAnswers', () => {
  it('is a section named "Respostas abertas" with a level 2 heading', () => {
    render(<OpenAnswers answered={[DAY_7]} />);

    const section = screen.getByRole('region', { name: 'Respostas abertas' });
    expect(within(section).getByRole('heading', { level: 2, name: 'Respostas abertas' })).toBeInTheDocument();
  });

  it('shows each open question with what the student wrote', () => {
    render(<OpenAnswers answered={[DAY_7]} />);

    expect(screen.getByText('Quer contar mais alguma coisa?')).toBeInTheDocument();
    expect(screen.getByText('Dormi mal por causa do trabalho.')).toBeInTheDocument();
  });

  it('shows the milestone and the date the student answered above its answers', () => {
    render(<OpenAnswers answered={[DAY_7]} />);

    const section = screen.getByRole('region', { name: 'Respostas abertas' });
    expect(within(section).getByText('7 dias')).toBeInTheDocument();
    expect(within(section).getByText('07/11/2026')).toBeInTheDocument();
  });

  it('names the milestone with the web label, not the label the service sent', () => {
    const adhoc = { ...answered(9, [openAnswer('q-8', 'Quer contar mais alguma coisa?', 'Tudo certo.')]), milestone: 'ADHOC', milestoneLabel: 'Avulso' };

    render(<OpenAnswers answered={[DAY_7, adhoc]} />);

    expect(screen.getByText('Envio manual')).toBeInTheDocument();
    expect(screen.getByText('7 dias')).toBeInTheDocument();
    expect(screen.queryByText('Avulso')).not.toBeInTheDocument();
    expect(screen.queryByText('D7')).not.toBeInTheDocument();
  });

  it('shows the label the service sent for a milestone the app does not know', () => {
    const unknown = { ...answered(9, [openAnswer('q-8', 'Quer contar mais alguma coisa?', 'Tudo certo.')]), milestone: 'D60', milestoneLabel: '60 dias' };

    render(<OpenAnswers answered={[unknown]} />);

    expect(screen.getByText('60 dias')).toBeInTheDocument();
  });

  it('shows the most recent feedback first, although it receives them oldest first', () => {
    render(<OpenAnswers answered={[DAY_7, DAY_21]} />);

    expect(comesBefore(screen.getByText('21 dias'), screen.getByText('7 dias'))).toBe(true);
    expect(comesBefore(screen.getByText('Semana ótima, consegui treinar tudo.'), screen.getByText('Dormi mal por causa do trabalho.'))).toBe(true);
  });

  it('keeps the answers of one feedback in the order of the service', () => {
    render(<OpenAnswers answered={[DAY_21]} />);

    expect(comesBefore(screen.getByText('Viagem a trabalho.'), screen.getByText('Semana ótima, consegui treinar tudo.'))).toBe(true);
    expect(screen.getByText('O que mais atrapalhou a rotina?')).toBeInTheDocument();
  });

  it('leaves out a feedback in which the student wrote nothing', () => {
    render(<OpenAnswers answered={[DAY_7, DAY_15_SILENT, DAY_21]} />);

    expect(screen.getByText('7 dias')).toBeInTheDocument();
    expect(screen.getByText('21 dias')).toBeInTheDocument();
    expect(screen.queryByText('15 dias')).not.toBeInTheDocument();
    expect(screen.queryByText('15/11/2026')).not.toBeInTheDocument();
  });

  it('does not reorder the list it was given', () => {
    const feedbacks = [DAY_7, DAY_15_SILENT, DAY_21];

    render(<OpenAnswers answered={feedbacks} />);

    expect(feedbacks).toEqual([DAY_7, DAY_15_SILENT, DAY_21]);
  });

  it('renders nothing when no answered feedback has an open answer', () => {
    const { container } = render(<OpenAnswers answered={[DAY_15_SILENT]} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('region', { name: 'Respostas abertas' })).not.toBeInTheDocument();
  });

  it('renders nothing when there is no answered feedback', () => {
    const { container } = render(<OpenAnswers answered={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
