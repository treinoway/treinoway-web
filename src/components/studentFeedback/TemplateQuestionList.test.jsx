import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import TemplateQuestionList from './TemplateQuestionList';

// Draft question as the builder keeps it; overrides replace any field
const draftQuestion = (overrides = {}) => ({
  key: 'q-1',
  text: 'Como foi sua adesão ao treino?',
  helpText: '',
  type: 'score',
  pillar: 'training_adherence',
  required: true,
  condition: null,
  invertScore: false,
  minLabel: '',
  maxLabel: '',
  ...overrides,
});

const TRAINING = draftQuestion();
const DIET = draftQuestion({ key: 'q-2', text: 'Como você avalia sua alimentação?', type: 'stars', pillar: 'diet_adherence', condition: 'has_meal_plan' });
const REPORT = draftQuestion({ key: 'q-3', text: 'Quer contar mais alguma coisa?', type: 'open', pillar: 'report', required: false });

// As many questions as asked, each under its own key
const manyQuestions = (count) => Array.from({ length: count }, (_, index) => draftQuestion({ key: `q-${index + 1}`, text: `Pergunta número ${index + 1}` }));

// Renders the list; extra props replace the defaults and the handlers are returned for assertions
const renderList = (props = {}) => {
  const handlers = { onSelect: vi.fn(), onMove: vi.fn(), onAdd: vi.fn() };
  render(<TemplateQuestionList questions={[TRAINING, DIET, REPORT]} selectedKey="q-1" {...handlers} {...props} />);
  return handlers;
};

// Rows of the question list, in the order shown
const rows = () => within(screen.getByRole('list', { name: 'Perguntas' })).getAllByRole('listitem');

// The button of a row that selects its question
const selectButtonOf = (row) => within(row).getByRole('button', { name: (name) => !name.startsWith('Mover pergunta') });

describe('TemplateQuestionList', () => {
  it('shows the questions in order under the "Perguntas" heading with the count against the limit', () => {
    renderList();

    expect(screen.getByRole('heading', { level: 2, name: 'Perguntas' })).toBeInTheDocument();
    expect(screen.getByText('3 de 15')).toBeInTheDocument();
    expect(rows().map((row) => within(row).getByText(/\?$/).textContent)).toEqual([TRAINING.text, DIET.text, REPORT.text]);
  });

  it('shows the answer type and the pillar of each question as badges', () => {
    renderList();
    const [training, diet, report] = rows();

    expect(within(training).getByText('Nota')).toHaveClass('badge');
    expect(within(training).getByText('Adesão (treino)')).toHaveClass('badge');
    expect(within(diet).getByText('Estrelas')).toBeInTheDocument();
    expect(within(diet).getByText('Adesão (plano alimentar)')).toBeInTheDocument();
    expect(within(report).getByText('Aberta')).toBeInTheDocument();
    expect(within(report).getByText('Relato')).toBeInTheDocument();
  });

  it('flags only an optional question as "Opcional" and only a conditional one as "Só com plano alimentar"', () => {
    renderList();
    const [training, diet, report] = rows();

    expect(within(training).queryByText('Opcional')).not.toBeInTheDocument();
    expect(within(training).queryByText('Só com plano alimentar')).not.toBeInTheDocument();
    expect(within(diet).getByText('Só com plano alimentar')).toBeInTheDocument();
    expect(within(diet).queryByText('Opcional')).not.toBeInTheDocument();
    expect(within(report).getByText('Opcional')).toBeInTheDocument();
    expect(within(report).queryByText('Só com plano alimentar')).not.toBeInTheDocument();
  });

  it('shows "Pergunta sem texto" for a question with no text yet', () => {
    renderList({ questions: [TRAINING, draftQuestion({ key: 'new-1', text: '' })] });

    expect(within(rows()[1]).getByText('Pergunta sem texto')).toBeInTheDocument();
  });

  it('marks only the selected question as the current one', () => {
    renderList({ selectedKey: 'q-2' });
    const [training, diet, report] = rows();

    expect(selectButtonOf(diet)).toHaveAttribute('aria-current', 'true');
    expect(selectButtonOf(training)).not.toHaveAttribute('aria-current');
    expect(selectButtonOf(report)).not.toHaveAttribute('aria-current');
  });

  it('marks no question as current when the selected key is not in the list', () => {
    renderList({ selectedKey: undefined });

    rows().forEach((row) => expect(selectButtonOf(row)).not.toHaveAttribute('aria-current'));
  });

  it('calls onSelect with the key of the clicked question', async () => {
    const user = userEvent.setup();
    const { onSelect, onMove } = renderList();

    await user.click(selectButtonOf(rows()[2]));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('q-3');
    expect(onMove).not.toHaveBeenCalled();
  });

  it('calls onMove with the row index and -1 for "up" and 1 for "down"', async () => {
    const user = userEvent.setup();
    const { onMove, onSelect } = renderList();

    await user.click(screen.getByRole('button', { name: 'Mover pergunta 2 para cima' }));
    await user.click(screen.getByRole('button', { name: 'Mover pergunta 2 para baixo' }));

    expect(onMove.mock.calls).toEqual([[1, -1], [1, 1]]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('disables "up" on the first question and "down" on the last one only', () => {
    renderList();

    expect(screen.getByRole('button', { name: 'Mover pergunta 1 para cima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover pergunta 1 para baixo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mover pergunta 2 para cima' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mover pergunta 2 para baixo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mover pergunta 3 para cima' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mover pergunta 3 para baixo' })).toBeDisabled();
  });

  it('disables both move buttons of the only question', () => {
    renderList({ questions: [TRAINING] });

    expect(screen.getByRole('button', { name: 'Mover pergunta 1 para cima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover pergunta 1 para baixo' })).toBeDisabled();
  });

  it('calls onAdd from "Adicionar pergunta"', async () => {
    const user = userEvent.setup();
    const { onAdd } = renderList();

    await user.click(screen.getByRole('button', { name: 'Adicionar pergunta' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('keeps "Adicionar pergunta" enabled at 14 questions', () => {
    renderList({ questions: manyQuestions(14) });

    expect(screen.getByText('14 de 15')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar pergunta' })).toBeEnabled();
  });

  it('disables "Adicionar pergunta" at 15 questions', async () => {
    const user = userEvent.setup();
    const { onAdd } = renderList({ questions: manyQuestions(15) });

    expect(screen.getByText('15 de 15')).toBeInTheDocument();
    const add = screen.getByRole('button', { name: 'Adicionar pergunta' });
    expect(add).toBeDisabled();
    await user.click(add);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('offers no move button and no "Adicionar pergunta" when read-only, but still selects', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderList({ readOnly: true });

    expect(screen.queryByRole('button', { name: /Mover pergunta/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar pergunta' })).not.toBeInTheDocument();
    expect(screen.getByText('3 de 15')).toBeInTheDocument();

    await user.click(selectButtonOf(rows()[1]));
    expect(onSelect).toHaveBeenCalledWith('q-2');
  });

  it('shows an empty list with the count at zero when there is no question', () => {
    renderList({ questions: [], selectedKey: undefined });

    expect(screen.getByText('0 de 15')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Perguntas' })).queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Adicionar pergunta' })).toBeEnabled();
  });
});
