import { describe, it, expect } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import PillarAnswers from './PillarAnswers';

const INVERTED_NOTE = 'Nesta pergunta, quanto menor a resposta, melhor a nota.';
const STRESS_QUESTION = 'De 0 a 10, quanto estresse você sentiu nesta semana?';
const TRAINING_QUESTION = 'De 0 a 10, quanto você seguiu o treino?';
const SLEEP_QUESTION = 'Como foi a qualidade do seu sono nesta semana?';

// Scored answer behind a pillar, with the fields of the trainer API; overrides replace any of them
const answer = (questionId, question, type, value, overrides = {}) => ({
  questionId,
  question,
  type,
  typeLabel: type === 'stars' ? 'Estrelas' : 'Nota',
  value,
  max: type === 'stars' ? 5 : 10,
  inverted: false,
  ...overrides,
});

// Renders the answers and returns the list item of each, in the order shown
const renderAnswers = (answers) => {
  render(<PillarAnswers id="pillar-answers" answers={answers} />);
  return screen.getAllByRole('listitem');
};

describe('PillarAnswers', () => {
  it('titles the block and lists one item per answer, in the order given', () => {
    const items = renderAnswers([
      answer('q-1', TRAINING_QUESTION, 'score', 8),
      answer('q-2', SLEEP_QUESTION, 'stars', 2),
    ]);

    expect(screen.getByText('O que o aluno respondeu')).toBeInTheDocument();
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText(TRAINING_QUESTION)).toBeInTheDocument();
    expect(within(items[1]).getByText(SLEEP_QUESTION)).toBeInTheDocument();
  });

  it('shows a score answer with the top of its scale and no stars', () => {
    const [item] = renderAnswers([answer('q-1', TRAINING_QUESTION, 'score', 8)]);

    expect(within(item).getByText('8 de 10')).toBeInTheDocument();
    expect(within(item).queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a decimal answer with a comma', () => {
    const [item] = renderAnswers([answer('q-1', TRAINING_QUESTION, 'score', 5.5)]);

    expect(within(item).getByText('5,5 de 10')).toBeInTheDocument();
    expect(item).not.toHaveTextContent('5.5');
  });

  it('shows a stars answer as stars announced with the count, next to the same value in text', () => {
    const [item] = renderAnswers([answer('q-2', SLEEP_QUESTION, 'stars', 2)]);

    expect(within(item).getByRole('img', { name: '2 de 5 estrelas' })).toBeInTheDocument();
    expect(within(item).getByText('2 de 5')).toBeInTheDocument();
  });

  it('explains under the question that a lower answer scores better when the answer is inverted', () => {
    const [item] = renderAnswers([answer('q-5', STRESS_QUESTION, 'score', 3, { inverted: true })]);

    expect(within(item).getByText(STRESS_QUESTION)).toBeInTheDocument();
    expect(within(item).getByText(INVERTED_NOTE)).toBeInTheDocument();
    expect(within(item).getByText('3 de 10')).toBeInTheDocument();
  });

  it('shows the note only on the inverted answers of the pillar', () => {
    const items = renderAnswers([
      answer('q-1', TRAINING_QUESTION, 'score', 8),
      answer('q-5', STRESS_QUESTION, 'score', 3, { inverted: true }),
      answer('q-2', SLEEP_QUESTION, 'stars', 2),
    ]);

    expect(screen.getAllByText(INVERTED_NOTE)).toHaveLength(1);
    expect(within(items[0]).queryByText(INVERTED_NOTE)).not.toBeInTheDocument();
    expect(within(items[1]).getByText(INVERTED_NOTE)).toBeInTheDocument();
    expect(within(items[2]).queryByText(INVERTED_NOTE)).not.toBeInTheDocument();
  });

  it('shows no note when the service does not say whether the answer is inverted', () => {
    const [item] = renderAnswers([answer('q-1', TRAINING_QUESTION, 'score', 8, { inverted: undefined })]);

    expect(within(item).queryByText(INVERTED_NOTE)).not.toBeInTheDocument();
    expect(within(item).getByText('8 de 10')).toBeInTheDocument();
  });

  it('shows an inverted decimal answer with both the note and the comma', () => {
    const [item] = renderAnswers([answer('q-5', STRESS_QUESTION, 'score', 7.5, { inverted: true })]);

    expect(within(item).getByText(INVERTED_NOTE)).toBeInTheDocument();
    expect(within(item).getByText('7,5 de 10')).toBeInTheDocument();
  });
});
