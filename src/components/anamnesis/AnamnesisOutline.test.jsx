import { render, screen, within } from '../../test/test-utils';
import AnamnesisOutline from './AnamnesisOutline';

const sections = [
  {
    id: 's-2',
    title: 'Hábitos',
    order: 1,
    questions: [
      { id: 'q-3', text: 'Quantas horas você dorme?', type: 'numeric', required: false, order: 0 },
    ],
  },
  {
    id: 's-1',
    title: 'Saúde',
    order: 0,
    questions: [
      { id: 'q-2', text: 'Qual medicamento?', type: 'free_text', required: false, order: 1, parentQuestionId: 'q-1' },
      { id: 'q-1', text: 'Usa medicamento?', type: 'dichotomous', required: true, order: 0 },
    ],
  },
  { id: 's-3', title: 'Observações', order: 2, questions: [] },
];

describe('AnamnesisOutline', () => {
  it('numbers the sections in order with their question count', () => {
    render(<AnamnesisOutline sections={sections} />);
    const items = screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(items).toEqual(['Saúde', 'Hábitos', 'Observações']);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2 perguntas')).toBeInTheDocument();
    expect(screen.getByText('1 pergunta')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma pergunta')).toBeInTheDocument();
  });

  it('lists the questions in order with type, required and conditional flags', () => {
    render(<AnamnesisOutline sections={sections} />);
    // lists: [0] = sections, [1] = questions of the first section
    const firstSection = screen.getAllByRole('list')[1];
    const questions = within(firstSection).getAllByRole('listitem');
    expect(questions[0]).toHaveTextContent('Usa medicamento?');
    expect(questions[0]).toHaveTextContent('Sim/Não · Obrigatória');
    expect(questions[1]).toHaveTextContent('Qual medicamento?');
    expect(questions[1]).toHaveTextContent('Texto livre · Condicional');
  });

  it('shows a message when there are no sections', () => {
    render(<AnamnesisOutline sections={[]} />);
    expect(screen.getByText('Esta anamnese não possui seções.')).toBeInTheDocument();
  });
});
