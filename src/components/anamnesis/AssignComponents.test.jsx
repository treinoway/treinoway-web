import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import AssignStudentRow from './AssignStudentRow';
import AssignStudentsPanel from './AssignStudentsPanel';
import AssignTemplateCard from './AssignTemplateCard';
import AssignFooter from './AssignFooter';

const student = { id: 'st1', firstName: 'João', lastName: 'Silva', email: 'joao@email.com' };

describe('AssignStudentRow', () => {
  it('shows avatar initials, name and email and toggles through the checkbox', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<AssignStudentRow student={student} onToggle={onToggle} />);
    expect(screen.getByText('JS')).toBeInTheDocument();
    expect(screen.getByText('joao@email.com')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /joão silva/i }));
    expect(onToggle).toHaveBeenCalledWith('st1');
  });

  it('falls back to the e-mail when there is no name', () => {
    render(<AssignStudentRow student={{ id: 'st2', email: 'x@y.com' }} onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: /x@y\.com/i })).toBeInTheDocument();
  });

  it('linked students are disabled and tagged', () => {
    render(<AssignStudentRow student={student} linked onToggle={vi.fn()} />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByText('Já enviada')).toBeInTheDocument();
  });
});

describe('AssignStudentsPanel', () => {
  const buildProps = (overrides = {}) => ({
    search: '',
    onSearchChange: vi.fn(),
    students: [student],
    totalCount: 1,
    selected: new Set(['st1']),
    linkedIds: new Set(),
    onToggle: vi.fn(),
    onOpenStudents: vi.fn(),
    ...overrides,
  });

  it('renders the list with the selected state and a search field', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<AssignStudentsPanel {...props} />);
    expect(screen.getByRole('checkbox', { name: /joão silva/i })).toBeChecked();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar aluno' }), 'a');
    expect(props.onSearchChange).toHaveBeenCalledWith('a');
  });

  it('shows the no-students empty state with a link to students', async () => {
    const user = userEvent.setup();
    const props = buildProps({ students: [], totalCount: 0 });
    render(<AssignStudentsPanel {...props} />);
    await user.click(screen.getByRole('button', { name: 'Ver alunos' }));
    expect(props.onOpenStudents).toHaveBeenCalled();
  });

  it('shows the no-results state when the filter hides everyone', () => {
    render(<AssignStudentsPanel {...buildProps({ students: [], totalCount: 3 })} />);
    expect(screen.getByText('Nenhum aluno encontrado')).toBeInTheDocument();
  });
});

describe('AssignTemplateCard', () => {
  const anamnesis = {
    title: 'Saúde',
    version: 2,
    sections: [{ questions: [{}, {}] }, { questions: [{}] }],
  };

  it('summarises version, sections and questions and opens the preview', async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    render(<AssignTemplateCard anamnesis={anamnesis} onPreview={onPreview} />);
    expect(screen.getByRole('heading', { name: 'Saúde' })).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('2 seções · 3 perguntas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pré-visualizar' }));
    expect(onPreview).toHaveBeenCalled();
  });

  it('uses singular forms and defaults the version to 1', () => {
    render(<AssignTemplateCard anamnesis={{ title: 'X', sections: [{ questions: [{}] }] }} onPreview={vi.fn()} />);
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('1 seção · 1 pergunta')).toBeInTheDocument();
  });
});

describe('AssignFooter', () => {
  it('disables submit with no selection and hides the counter', () => {
    render(<AssignFooter selectedCount={0} onCancel={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Enviar para 0 alunos' })).toBeDisabled();
    expect(screen.queryByText(/selecionado/)).not.toBeInTheDocument();
  });

  it('shows the counter and submits / cancels', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<AssignFooter selectedCount={2} onCancel={onCancel} onSubmit={onSubmit} />);
    expect(screen.getByText('2 alunos selecionados')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enviar para 2 alunos' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onSubmit).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('uses singular copy for one student', () => {
    render(<AssignFooter selectedCount={1} onCancel={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText('1 aluno selecionado')).toBeInTheDocument();
  });

  it('disables both actions and shows the busy label while submitting', () => {
    render(<AssignFooter selectedCount={2} submitting onCancel={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
