import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import AnamnesisOutlinePanel from './AnamnesisOutlinePanel';

const sections = [
  {
    id: 's1',
    title: 'Saúde',
    description: '',
    order: 0,
    questions: [
      { id: 'q1', text: 'Pergunta pai', type: 'dichotomous' },
      { id: 'q2', text: 'Pergunta filha', type: 'free_text', parentQuestionId: 'q1' },
    ],
  },
  { id: 's2', title: 'Treino', description: '', order: 1, questions: [] },
];

const buildProps = (overrides = {}) => ({
  sections,
  isGeneral: false,
  selection: {
    selectedSectionId: 's1',
    selectedQuestionId: 'q1',
    handleSelectSection: vi.fn(),
    handleSelectQuestion: vi.fn(),
  },
  sectionsEditor: {
    showSectionForm: false,
    sectionForm: { title: '' },
    savingSection: false,
    openSectionForm: vi.fn(),
    closeSectionForm: vi.fn(),
    changeSectionTitle: vi.fn(),
    handleAddSection: vi.fn((e) => e.preventDefault()),
    handleDeleteSection: vi.fn(),
    handleEditSection: vi.fn().mockResolvedValue(true),
  },
  reorder: { dragOverId: null, getDragHandlers: () => ({ draggable: true }) },
  onDeleteQuestion: vi.fn(),
  ...overrides,
});

describe('AnamnesisOutlinePanel', () => {
  it('lists sections and only the active section questions, flagging conditional ones', () => {
    render(<AnamnesisOutlinePanel {...buildProps()} />);
    expect(screen.getByText('Saúde')).toBeInTheDocument();
    expect(screen.getByText('Treino')).toBeInTheDocument();
    expect(screen.getByText('Pergunta pai')).toBeInTheDocument();
    expect(screen.getByText('↳ condicional')).toBeInTheDocument();
  });

  it('selects a section and a question', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<AnamnesisOutlinePanel {...props} />);
    await user.click(screen.getByText('Treino'));
    expect(props.selection.handleSelectSection).toHaveBeenCalledWith('s2');
    await user.click(screen.getByText('Pergunta filha'));
    expect(props.selection.handleSelectQuestion).toHaveBeenCalledWith('q2', 's1');
  });

  it('asks to delete a section and a question without selecting them', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<AnamnesisOutlinePanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'Excluir seção Treino' }));
    expect(props.sectionsEditor.handleDeleteSection).toHaveBeenCalledWith(sections[1]);
    await user.click(screen.getByRole('button', { name: 'Excluir pergunta Pergunta pai' }));
    expect(props.onDeleteQuestion).toHaveBeenCalledWith(sections[0], sections[0].questions[0]);
    expect(props.selection.handleSelectQuestion).not.toHaveBeenCalled();
  });

  it('edits a section title inline and cancels', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<AnamnesisOutlinePanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'Editar seção Treino' }));
    const input = screen.getByRole('textbox', { name: 'Título da seção' });
    expect(input).toHaveValue('Treino');
    await user.clear(input);
    await user.type(input, 'Rotina');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(props.sectionsEditor.handleEditSection).toHaveBeenCalledWith('s2', { title: 'Rotina', description: '' });
    await user.click(screen.getByRole('button', { name: 'Editar seção Saúde' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('textbox', { name: 'Título da seção' })).not.toBeInTheDocument();
  });

  it('opens the new-section form and cancels it', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    const { rerender } = render(<AnamnesisOutlinePanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'Nova seção' }));
    expect(props.sectionsEditor.openSectionForm).toHaveBeenCalledTimes(1);
    rerender(
      <AnamnesisOutlinePanel
        {...props}
        sectionsEditor={{ ...props.sectionsEditor, showSectionForm: true }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(props.sectionsEditor.closeSectionForm).toHaveBeenCalledTimes(1);
  });

  it('general anamnesis is read-only: no actions and no new-section button', () => {
    render(<AnamnesisOutlinePanel {...buildProps({ isGeneral: true })} />);
    expect(screen.queryByRole('button', { name: /^Editar seção/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Excluir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova seção' })).not.toBeInTheDocument();
  });

  it('marks the section being dragged over', () => {
    const props = buildProps({ reorder: { dragOverId: 's2', getDragHandlers: () => ({}) } });
    render(<AnamnesisOutlinePanel {...props} />);
    const target = screen.getByText('Treino').closest('[role="button"]');
    expect(target).toHaveClass('outline-section-btn--drag-over');
  });
});
