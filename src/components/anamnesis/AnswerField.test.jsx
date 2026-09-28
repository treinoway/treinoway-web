import { useState } from 'react';
import PropTypes from 'prop-types';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import AnswerField from './AnswerField';

const choiceOptions = [
  { id: 'o1', text: 'Corrida' },
  { id: 'o2', text: 'Yoga' },
  { id: 'o3', text: 'Natação' },
];

const buildQuestion = (overrides) => ({
  id: 'q1',
  text: 'Pergunta de teste',
  type: 'free_text',
  required: false,
  options: [],
  config: null,
  ...overrides,
});

const Harness = ({ question, initial, error, index }) => {
  const [value, setValue] = useState(initial);
  return <AnswerField question={question} value={value} onChange={setValue} error={error} index={index} />;
};

Harness.propTypes = {
  question: PropTypes.object.isRequired,
  initial: PropTypes.any,
  error: PropTypes.string,
  index: PropTypes.number,
};

describe('AnswerField', () => {
  it('renders free text as a labelled textarea and reports changes', async () => {
    const user = userEvent.setup();
    render(<Harness question={buildQuestion({ text: 'Qual seu objetivo?' })} />);
    const field = screen.getByRole('textbox', { name: /Qual seu objetivo\?/ });
    await user.type(field, 'Emagrecer');
    expect(field).toHaveValue('Emagrecer');
  });

  it('renders numeric with decimal input mode, bounds and unit', async () => {
    const user = userEvent.setup();
    const question = buildQuestion({
      text: 'Peso atual',
      type: 'numeric',
      config: { min: '30', max: '300', unit: 'kg' },
    });
    render(<Harness question={question} />);
    const field = screen.getByRole('spinbutton', { name: /Peso atual/ });
    expect(field).toHaveAttribute('inputmode', 'decimal');
    expect(field).toHaveAttribute('min', '30');
    expect(field).toHaveAttribute('max', '300');
    expect(screen.getByText('kg')).toBeInTheDocument();
    await user.type(field, '72.5');
    expect(field).toHaveValue(72.5);
  });

  it('ignores empty numeric bounds', () => {
    const question = buildQuestion({ type: 'numeric', config: { min: '', max: '' } });
    render(<Harness question={question} />);
    const field = screen.getByRole('spinbutton');
    expect(field).not.toHaveAttribute('min');
    expect(field).not.toHaveAttribute('max');
  });

  it('renders dichotomous as a yes/no radio pair inside a named group', async () => {
    const user = userEvent.setup();
    render(<Harness question={buildQuestion({ text: 'Pratica exercício?', type: 'dichotomous' })} />);
    expect(screen.getByRole('group', { name: /Pratica exercício\?/ })).toBeInTheDocument();
    const yes = screen.getByRole('radio', { name: 'Sim' });
    const no = screen.getByRole('radio', { name: 'Não' });
    expect(yes).not.toBeChecked();
    await user.click(yes);
    expect(yes).toBeChecked();
    await user.click(no);
    expect(no).toBeChecked();
    expect(yes).not.toBeChecked();
  });

  it('renders single choice as radios over the question options', async () => {
    const user = userEvent.setup();
    render(<Harness question={buildQuestion({ type: 'single_choice', options: choiceOptions })} initial="Yoga" />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Yoga' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Corrida' }));
    expect(screen.getByRole('radio', { name: 'Corrida' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Yoga' })).not.toBeChecked();
  });

  it('renders multiple choice as checkboxes storing option texts', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const question = buildQuestion({ type: 'multiple_choice', options: choiceOptions });
    render(<AnswerField question={question} value={['Corrida']} onChange={onChange} />);
    expect(screen.getByRole('checkbox', { name: 'Corrida' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Yoga' })).not.toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Yoga' }));
    expect(onChange).toHaveBeenLastCalledWith(['Corrida', 'Yoga']);
    await user.click(screen.getByRole('checkbox', { name: 'Corrida' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('renders matrix as single-choice radios', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const question = buildQuestion({ type: 'matrix', options: choiceOptions });
    render(<AnswerField question={question} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'Natação' }));
    expect(onChange).toHaveBeenCalledWith('Natação');
  });

  it('shows the question number and marks required questions', () => {
    render(<Harness question={buildQuestion({ text: 'Objetivo', required: true })} index={2} />);
    expect(screen.getByRole('textbox', { name: /3\. Objetivo.*obrigatória/ })).toBeInTheDocument();
  });

  it('announces the error and links it to the input', () => {
    render(<Harness question={buildQuestion({ text: 'Objetivo' })} error="Esta pergunta é obrigatória." />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Esta pergunta é obrigatória.');
    const field = screen.getByRole('textbox');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Esta pergunta é obrigatória.');
  });

  it('links the error to a radio group', () => {
    const question = buildQuestion({ type: 'dichotomous', text: 'Treina?' });
    render(<Harness question={question} error="Esta pergunta é obrigatória." />);
    expect(screen.getByRole('group', { name: /Treina\?/ })).toHaveAccessibleDescription(
      'Esta pergunta é obrigatória.',
    );
  });

  it('renders no alert without an error', () => {
    render(<Harness question={buildQuestion()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
