import userEvent from '@testing-library/user-event';
import { renderWithRoute, screen, waitFor } from '../../test/test-utils';
import AssignAnamnesis from './AssignAnamnesis';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Silence AnamnesisPreviewModal complexity in tests
vi.mock('../../components/AnamnesisPreviewModal', () => ({
  default: ({ open, onClose }) =>
    open ? (
      <div role="dialog" aria-label="Pré-visualização da anamnese">
        <button onClick={onClose}>Fechar pré-visualização</button>
      </div>
    ) : null,
}));

const mockShowToast = vi.fn();

const mockAnamnesis = {
  id: 'anamnesis-1',
  title: 'Saúde & Histórico Clínico',
  version: 2,
  sections: [
    {
      id: 'sec-1',
      title: 'Seção 1',
      order: 0,
      questions: [
        { id: 'q1', text: 'Pergunta 1', type: 'free_text', required: true, order: 0 },
        { id: 'q2', text: 'Pergunta 2', type: 'dichotomous', required: false, order: 1 },
      ],
    },
  ],
};

const mockStudents = [
  { id: 'student-1', firstName: 'João', lastName: 'Silva', email: 'joao@email.com' },
  { id: 'student-2', firstName: 'Maria', lastName: 'Santos', email: 'maria@email.com' },
  { id: 'student-3', firstName: 'Pedro', lastName: 'Costa', email: 'pedro@email.com' },
];

function renderAssign(anamnesisId = 'anamnesis-1') {
  return renderWithRoute(<AssignAnamnesis />, {
    route: `/trainer/anamneses/${anamnesisId}/assign`,
    path: '/trainer/anamneses/:anamnesisId/assign',
  });
}

function setupDefaultMocks({ linkedStudentIds = [] } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/anamneses/anamnesis-1') {
      return Promise.resolve({ data: mockAnamnesis });
    }
    if (url === '/trainer/students') {
      return Promise.resolve({ data: mockStudents });
    }
    if (url.startsWith('/trainer/students/') && url.endsWith('/anamneses')) {
      const studentId = url.split('/')[3];
      const isLinked = linkedStudentIds.includes(studentId);
      const links = isLinked
        ? [{ id: 'link-x', anamnesis: { id: 'anamnesis-1', title: 'Saúde & Histórico Clínico' } }]
        : [];
      return Promise.resolve({ data: links });
    }
    return Promise.resolve({ data: [] });
  });
}

describe('AssignAnamnesis', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
  });

  it('shows loading state initially', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderAssign();
    expect(screen.getByRole('status', { name: /carregando anamnese/i })).toBeInTheDocument();
  });

  it('renders template title and student list after load', async () => {
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => {
      expect(screen.getByText('Saúde & Histórico Clínico')).toBeInTheDocument();
    });
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('Pedro Costa')).toBeInTheDocument();
  });

  it('renders template version badge and question count', async () => {
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => {
      expect(screen.getByText('v2')).toBeInTheDocument();
    });
    expect(screen.getByText(/1 seção · 2 perguntas/)).toBeInTheDocument();
  });

  it('filters student list by name (case-insensitive)', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/buscar aluno/i), 'maria');

    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.queryByText('Pedro Costa')).not.toBeInTheDocument();
  });

  it('filters student list by email', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/buscar aluno/i), 'pedro@');

    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Pedro Costa')).toBeInTheDocument();
  });

  it('disables checkbox and shows "Já enviada" badge for already-linked student', async () => {
    setupDefaultMocks({ linkedStudentIds: ['student-2'] });
    renderAssign();
    await waitFor(() => expect(screen.getByText('Maria Santos')).toBeInTheDocument());

    expect(screen.getByText('Já enviada')).toBeInTheDocument();

    expect(screen.getByRole('checkbox', { name: /maria santos/i })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /joão silva/i })).toBeEnabled();
  });

  it('selecting 3 students shows correct counter and enables CTA', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    await user.click(screen.getByRole('checkbox', { name: /joão silva/i }));
    await user.click(screen.getByRole('checkbox', { name: /maria santos/i }));
    await user.click(screen.getByRole('checkbox', { name: /pedro costa/i }));

    expect(screen.getByText(/3 alunos selecionados/i)).toBeInTheDocument();

    const cta = screen.getByRole('button', { name: /enviar para 3 alunos/i });
    expect(cta).not.toBeDisabled();
  });

  it('CTA is disabled when 0 students selected', async () => {
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    const cta = screen.getByRole('button', { name: /enviar para 0 alunos/i });
    expect(cta).toBeDisabled();
  });

  it('submit success — fires 3 POSTs and shows success toast then navigates back', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    api.post.mockResolvedValue({ data: {} });
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    await user.click(screen.getByRole('checkbox', { name: /joão silva/i }));
    await user.click(screen.getByRole('checkbox', { name: /maria santos/i }));
    await user.click(screen.getByRole('checkbox', { name: /pedro costa/i }));
    await user.click(screen.getByRole('button', { name: /enviar para 3 alunos/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(3);
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/students/student-1/anamneses',
        { anamnesisId: 'anamnesis-1' },
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        'Anamnese enviada para 3 alunos',
        'success',
      );
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it('partial failure — shows partial toast and does not navigate', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    api.post
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({ data: {} })
      .mockRejectedValueOnce({ userMessage: 'Erro' });
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    await user.click(screen.getByRole('checkbox', { name: /joão silva/i }));
    await user.click(screen.getByRole('checkbox', { name: /maria santos/i }));
    await user.click(screen.getByRole('checkbox', { name: /pedro costa/i }));
    await user.click(screen.getByRole('button', { name: /enviar para 3 alunos/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(/2 de 3 envios concluídos/i),
        'warning',
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('cancel button navigates back without any API call', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.post).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('back button navigates back', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /voltar/i }));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('mobile: segmented tabs switch the active panel', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    const studentsTab = screen.getByRole('tab', { name: 'Alunos' });
    const configTab = screen.getByRole('tab', { name: 'Anamnese' });
    expect(studentsTab).toHaveAttribute('aria-selected', 'true');

    await user.click(configTab);
    expect(configTab).toHaveAttribute('aria-selected', 'true');
    expect(studentsTab).toHaveAttribute('aria-selected', 'false');
    expect(document.getElementById(configTab.getAttribute('aria-controls'))).toHaveAttribute('role', 'tabpanel');

    await user.click(studentsTab);
    expect(studentsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('opens preview modal when "Pré-visualizar" is clicked', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => expect(screen.getByText('Saúde & Histórico Clínico')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /pré-visualizar/i }));

    expect(screen.getByRole('dialog', { name: /pré-visualização/i })).toBeInTheDocument();
  });

  it('closes preview modal when "Fechar pré-visualização" is clicked', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => expect(screen.getByText('Saúde & Histórico Clínico')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /pré-visualizar/i }));
    await user.click(screen.getByRole('button', { name: /fechar pré-visualização/i }));

    expect(screen.queryByRole('dialog', { name: /pré-visualização/i })).not.toBeInTheDocument();
  });

  it('shows an in-place error with retry when loading fails', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValueOnce({ userMessage: 'Falha de rede' });
    renderAssign();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Falha de rede');
    expect(mockNavigate).not.toHaveBeenCalled();

    setupDefaultMocks();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('João Silva')).toBeInTheDocument();
  });

  it('shows "not found" only after a 404 and offers a way back', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValue({ response: { status: 404 } });
    renderAssign();

    expect(await screen.findByText('Anamnese não encontrada')).toBeInTheDocument();
    const backButtons = screen.getAllByRole('button', { name: /voltar/i });
    await user.click(backButtons[backButtons.length - 1]);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('total failure — shows the error toast, keeps the selection and does not navigate', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    api.post.mockRejectedValue({ userMessage: 'Erro' });
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    await user.click(screen.getByRole('checkbox', { name: /joão silva/i }));
    await user.click(screen.getByRole('button', { name: /enviar para 1 aluno/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Nenhuma anamnese foi enviada. Tente novamente.', 'error');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: /joão silva/i })).toBeChecked();
  });

  it('goes back to the origin received in the location state instead of history', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    renderWithRoute(<AssignAnamnesis />, {
      route: { pathname: '/trainer/anamneses/anamnesis-1/assign', state: { from: '/trainer/anamneses/anamnesis-1' } },
      path: '/trainer/anamneses/:anamnesisId/assign',
    });
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1');
  });

  it('shows an empty state when the trainer has no students', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/trainer/anamneses/anamnesis-1' ? mockAnamnesis : [],
    }));
    renderAssign();

    expect(await screen.findByText('Sem alunos ainda')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver alunos' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students');
  });

  it('shows a no-results state when the search matches nobody', async () => {
    const user = userEvent.setup();
    setupDefaultMocks();
    renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText(/buscar aluno/i), 'zzz');

    expect(screen.getByText('Nenhum aluno encontrado')).toBeInTheDocument();
  });

  it('renders no inline styles', async () => {
    setupDefaultMocks();
    const { container } = renderAssign();
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument());
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });
});
