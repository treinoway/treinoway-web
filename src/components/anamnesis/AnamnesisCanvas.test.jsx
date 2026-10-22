import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import AnamnesisCanvas from './AnamnesisCanvas';
import { sortSections, deriveEditorView } from '../../utils/anamnesisEditor';

vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../api/axios', () => ({ default: { patch: vi.fn() } }));

const sectionsWithQuestions = [
  {
    id: 's1',
    title: 'Saúde',
    order: 0,
    questions: [
      { id: 'q1', text: 'Primeira', type: 'free_text', required: false, options: [] },
      { id: 'q2', text: 'Segunda', type: 'free_text', required: false, options: [] },
    ],
  },
];

const buildProps = (sections, selectedSectionId, selectedQuestionId, overrides = {}) => ({
  anamnesisId: 'a1',
  isGeneral: false,
  hasSections: sections.length > 0,
  view: deriveEditorView(sortSections(sections), selectedSectionId, selectedQuestionId),
  questions: {
    handleAddQuestion: vi.fn(),
    handleQuestionUpdated: vi.fn(),
    clearJustCreated: vi.fn(),
    justCreatedQuestionId: null,
  },
  sectionsEditor: {
    sectionForm: { title: '' },
    savingSection: false,
    changeSectionTitle: vi.fn(),
    handleAddSection: vi.fn((e) => e.preventDefault()),
  },
  onStepQuestion: vi.fn(),
  onDeleteQuestion: vi.fn(),
  ...overrides,
});

describe('AnamnesisCanvas', () => {
  it('renders the selected question with a prev/next stepper', async () => {
    const user = userEvent.setup();
    const props = buildProps(sectionsWithQuestions, 's1', 'q1');
    render(<AnamnesisCanvas {...props} />);
    expect(screen.getByRole('textbox', { name: 'Texto da pergunta' })).toHaveValue('Primeira');
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /próxima/i }));
    expect(props.onStepQuestion).toHaveBeenCalledWith(1);
  });

  it('asks to delete the selected question from its section', async () => {
    const user = userEvent.setup();
    const props = buildProps(sectionsWithQuestions, 's1', 'q2');
    render(<AnamnesisCanvas {...props} />);
    await user.click(screen.getByRole('button', { name: 'Excluir pergunta' }));
    expect(props.onDeleteQuestion).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1' }),
      expect.objectContaining({ id: 'q2' }),
    );
  });

  it('general anamnesis without a selected question shows the read-only board', () => {
    render(<AnamnesisCanvas {...buildProps([], null, null, { isGeneral: true })} />);
    expect(screen.getByText('SOMENTE LEITURA')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('without sections shows the first-section form', async () => {
    const user = userEvent.setup();
    const props = buildProps([], null, null);
    render(<AnamnesisCanvas {...props} />);
    expect(screen.getByText('PASSO 1 DE 3')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Título da seção' }), 'H');
    expect(props.sectionsEditor.changeSectionTitle).toHaveBeenCalledWith('H');
  });

  it('section without questions shows shortcuts that add to the active section', async () => {
    const user = userEvent.setup();
    const empty = [{ id: 's1', title: 'Saúde', order: 0, questions: [] }];
    const props = buildProps(empty, 's1', null);
    render(<AnamnesisCanvas {...props} />);
    expect(screen.getByText('SAÚDE')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sim/Não' }));
    expect(props.questions.handleAddQuestion).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ type: 'dichotomous' }),
    );
  });
});
