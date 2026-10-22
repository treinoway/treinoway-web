import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/test-utils';
import QuestionOptionsEditor from './QuestionOptionsEditor';
import QuestionNumericConfig from './QuestionNumericConfig';
import QuestionConditionEditor from './QuestionConditionEditor';
import CanvasEmptyBoard from './CanvasEmptyBoard';

describe('QuestionOptionsEditor', () => {
  it('adds an option by button and by Enter, trimming and ignoring blanks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuestionOptionsEditor options={[{ text: 'A' }]} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    await user.type(screen.getByPlaceholderText('Nova opção...'), '  B  ');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(onChange).toHaveBeenCalledWith([{ text: 'A' }, { text: 'B' }]);
    await user.type(screen.getByPlaceholderText('Nova opção...'), 'C{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([{ text: 'A' }, { text: 'C' }]);
  });

  it('removes an option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuestionOptionsEditor options={[{ text: 'A' }, { text: 'B' }]} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Remover opção A' }));
    expect(onChange).toHaveBeenCalledWith([{ text: 'B' }]);
  });

  it('read-only hides add and remove controls', () => {
    render(<QuestionOptionsEditor options={[{ text: 'A' }]} readOnly onChange={vi.fn()} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Nova opção...')).not.toBeInTheDocument();
  });
});

describe('QuestionNumericConfig', () => {
  it('shows current values and reports blurs per field', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    const onFieldBlur = vi.fn(() => handler);
    render(<QuestionNumericConfig config={{ min: 1, max: 9, unit: 'kg' }} onFieldBlur={onFieldBlur} />);
    expect(screen.getByLabelText('Mín')).toHaveValue(1);
    expect(screen.getByLabelText('Unidade')).toHaveValue('kg');
    await user.click(screen.getByLabelText('Máx'));
    await user.tab();
    expect(onFieldBlur).toHaveBeenCalledWith('max');
    expect(handler).toHaveBeenCalled();
  });

  it('disables the inputs', () => {
    render(<QuestionNumericConfig config={null} disabled onFieldBlur={() => vi.fn()} />);
    expect(screen.getByLabelText('Mín')).toBeDisabled();
  });
});

describe('QuestionConditionEditor', () => {
  const parent = { id: 'p', text: 'Fuma?', type: 'dichotomous', options: [] };
  const child = { id: 'c', text: 'Quanto?', type: 'free_text', parentQuestionId: null, condition: null };

  it('picks a parent and seeds its default condition', async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    render(<QuestionConditionEditor question={child} sectionQuestions={[parent, child]} onPatch={onPatch} />);
    await user.selectOptions(screen.getByLabelText('Pergunta pai para exibição condicional'), 'p');
    expect(onPatch).toHaveBeenCalledWith({
      parentQuestionId: 'p',
      condition: { operator: 'equals', value: 'yes' },
    });
  });

  it('changes the trigger and removes the condition', async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    const conditional = { ...child, parentQuestionId: 'p', condition: { operator: 'equals', value: 'yes' } };
    render(<QuestionConditionEditor question={conditional} sectionQuestions={[parent, conditional]} onPatch={onPatch} />);
    expect(screen.getByRole('radio', { name: 'Sim' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Não' }));
    expect(onPatch).toHaveBeenCalledWith({
      parentQuestionId: 'p',
      condition: { operator: 'equals', value: 'no' },
    });
    await user.click(screen.getByRole('button', { name: 'Remover condição' }));
    expect(onPatch).toHaveBeenLastCalledWith({ parentQuestionId: null, condition: null });
  });

  it('warns when the parent has no options', () => {
    const singleParent = { id: 'p', text: 'Nível', type: 'single_choice', options: [] };
    const conditional = { ...child, parentQuestionId: 'p', condition: null };
    render(<QuestionConditionEditor question={conditional} sectionQuestions={[singleParent, conditional]} onPatch={vi.fn()} />);
    expect(screen.getByText('A pergunta pai não possui opções cadastradas.')).toBeInTheDocument();
  });

  it('toggles multiple-choice triggers', async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    const multi = { id: 'p', text: 'Dores', type: 'multiple_choice', options: [{ id: 'o1', text: 'Joelho' }, { id: 'o2', text: 'Ombro' }] };
    const conditional = { ...child, parentQuestionId: 'p', condition: { operator: 'includesAny', optionIds: ['o1'] } };
    render(<QuestionConditionEditor question={conditional} sectionQuestions={[multi, conditional]} onPatch={onPatch} />);
    await user.click(screen.getByRole('checkbox', { name: 'Ombro' }));
    expect(onPatch).toHaveBeenCalledWith({
      parentQuestionId: 'p',
      condition: { operator: 'includesAny', optionIds: ['o1', 'o2'] },
    });
    await user.click(screen.getByRole('checkbox', { name: 'Joelho' }));
    expect(onPatch).toHaveBeenLastCalledWith({
      parentQuestionId: 'p',
      condition: { operator: 'includesAny', optionIds: [] },
    });
  });
});

describe('CanvasEmptyBoard', () => {
  it('no-section: submits the form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<CanvasEmptyBoard variant="no-section" sectionTitle="Hist" saving={false} onTitleChange={vi.fn()} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Criar primeira seção' }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('no-section: shows the busy label while saving', () => {
    render(<CanvasEmptyBoard variant="no-section" sectionTitle="Hist" saving onTitleChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Criando...' })).toBeDisabled();
  });

  it('no-question: shortcuts and presets add questions', async () => {
    const user = userEvent.setup();
    const onAddQuestion = vi.fn();
    render(<CanvasEmptyBoard variant="no-question" section={{ title: 'Saúde' }} onAddQuestion={onAddQuestion} />);
    await user.click(screen.getByRole('button', { name: 'Texto livre' }));
    expect(onAddQuestion).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'free_text' }));
    await user.click(screen.getByRole('button', { name: 'Alergias alimentares' }));
    expect(onAddQuestion).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Alergias alimentares' }));
  });

  it('read-only: explains how to get an editable copy', () => {
    render(<CanvasEmptyBoard variant="read-only" />);
    expect(screen.getByText(/copiar para minha coleção/i)).toBeInTheDocument();
  });
});
