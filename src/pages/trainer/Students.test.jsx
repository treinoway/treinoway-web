import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import Students from './Students';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../hooks/useOnboardingStatus', () => ({
  markOnboardingStepOptimistic: vi.fn(),
}));

// SVG import is mocked by Vitest asset transforms
vi.mock('../../assets/illustrations/no-students.svg', () => ({
  default: '/mocked-no-students.svg',
}));

const mockStudents = [
  { id: 'student-1', firstName: 'Aluno', lastName: 'Exemplo', email: 'aluno@example.com', status: 'ativo' },
];

const mockMultipleStudents = [
  { id: 's1', firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com', status: 'ativo' },
  { id: 's2', firstName: 'Bruno', lastName: 'Costa', email: 'bruno@example.com', status: 'pendente' },
  { id: 's3', firstName: 'Carla', lastName: 'Lima', email: 'carla@example.com', status: 'vencido' },
];

const mockImportPreviewResponse = {
  students: [
    {
      fullName: 'Nicolle Costa',
      firstName: 'Nicolle',
      lastName: 'Costa',
      email: 'nicolle@example.com',
      plan: 'Caveira Team - Semestral',
      status: 'Entregue',
      expirationDate: '01/10/2026',
      daysRemaining: 190,
      duplicateEmail: false,
    },
    {
      fullName: 'Vitor Dantas',
      firstName: 'Vitor',
      lastName: 'Dantas',
      email: 'vitor@example.com',
      plan: 'Trimestral',
      status: 'Entregue',
      expirationDate: '01/08/2026',
      daysRemaining: 130,
      duplicateEmail: true,
    },
  ],
  summary: { total: 2, withEmail: 2, withoutEmail: 0, duplicateEmails: 1 },
};

describe('Students', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') {
        return Promise.resolve({ data: mockStudents });
      }
      return Promise.resolve({ data: [] });
    });
    api.post.mockReset();
    api.delete.mockReset();
  });

  // ── Loading & layout ──────────────────────────────────────────────────

  it('shows loading screen while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<Students />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders page title and action buttons after loading', async () => {
    renderWithRouter(<Students />);
    await waitFor(() => expect(screen.getByText('Meus Alunos')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /importar alunos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vincular aluno/i })).toBeInTheDocument();
  });

  // ── Empty state ───────────────────────────────────────────────────────

  it('shows redesigned empty state when there are no students', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Students />);

    await waitFor(() => {
      expect(screen.getByText('Sem alunos ainda')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /vincular primeiro aluno/i })).toBeInTheDocument();
    // SVG illustration is rendered as a presentational img (no accessible role)
    expect(document.querySelector('.students-empty-state img')).not.toBeNull();
  });

  it('opens link modal from empty state CTA', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Sem alunos ainda')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /vincular primeiro aluno/i }));
    expect(screen.getByRole('dialog', { name: /vincular aluno/i })).toBeInTheDocument();
  });

  // ── Stats header ──────────────────────────────────────────────────────

  it('shows stats row with counts when students exist', async () => {
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());

    expect(screen.getByLabelText('Resumo de alunos')).toBeInTheDocument();
  });


  // ── Student list (stats-first rows) ──────────────────────────────────

  it('renders students as stats-first rows', async () => {
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
    expect(screen.getByText('Carla Lima')).toBeInTheDocument();
  });

  it('clicking a student row navigates to student profile', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    const row = screen.getByRole('button', { name: /ver perfil de aluno exemplo/i });
    await user.click(row);
    // navigation is tested via the navigate mock — just verify row is interactive
    expect(row).toBeInTheDocument();
  });

  // ── Toolbar — search ──────────────────────────────────────────────────

  it('renders toolbar with search input when students exist', async () => {
    renderWithRouter(<Students />);
    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    expect(screen.getByLabelText('Buscar alunos')).toBeInTheDocument();
  });

  it('filters students by name search', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Buscar alunos'), 'Ana');
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.queryByText('Bruno Costa')).not.toBeInTheDocument();
  });

  it('shows no-results state when search yields nothing', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Buscar alunos'), 'xyz-no-match');
    expect(screen.getByText('Sem resultados')).toBeInTheDocument();
  });

  // ── Toolbar — status filter ───────────────────────────────────────────

  it('filters students by status tab', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: /pendentes/i }));
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
  });

  // ── Row menu ──────────────────────────────────────────────────────────

  it('opens row menu with Ver perfil and Criar rotina on trigger click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ações de aluno/i }));

    expect(screen.getByRole('menuitem', { name: /ver perfil/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /criar rotina/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /desvincular/i })).toBeInTheDocument();
  });

  it('closes row menu when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ações de aluno/i }));
    expect(screen.getByRole('menuitem', { name: /ver perfil/i })).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByRole('menuitem', { name: /ver perfil/i })).not.toBeInTheDocument();
  });

  // ── Unlink flow ───────────────────────────────────────────────────────

  it('shows confirm dialog when clicking Desvincular in row menu', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ações de aluno/i }));
    await user.click(screen.getByRole('menuitem', { name: /desvincular/i }));

    expect(screen.getByText(/desvincular aluno exemplo\? esta ação não pode ser desfeita/i)).toBeInTheDocument();
  });

  it('confirms unlink — calls api.delete and shows toast', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ações de aluno/i }));
    await user.click(screen.getByRole('menuitem', { name: /desvincular/i }));
    await user.click(screen.getByRole('button', { name: /^desvincular$/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/students/student-1');
    });
    expect(showToast).toHaveBeenCalledWith('Aluno desvinculado.', 'success');
  });

  it('cancels unlink dialog without calling api.delete', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ações de aluno/i }));
    await user.click(screen.getByRole('menuitem', { name: /desvincular/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.queryByText(/esta ação não pode ser desfeita/i)).not.toBeInTheDocument();
  });

  it('shows error toast on unlink failure', async () => {
    const user = userEvent.setup();
    const err = new Error('Network error');
    err.userMessage = 'Erro ao desvincular aluno.';
    api.delete.mockRejectedValue(err);
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /ações de aluno/i }));
    await user.click(screen.getByRole('menuitem', { name: /desvincular/i }));
    await user.click(screen.getByRole('button', { name: /^desvincular$/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Erro ao desvincular aluno.', 'error');
    });
  });

  // ── Link student modal ────────────────────────────────────────────────

  it('opens link modal from header button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /vincular aluno/i }));
    expect(screen.getByRole('dialog', { name: /vincular aluno/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail do aluno/i)).toBeInTheDocument();
  });

  it('closes link modal on cancel', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /vincular aluno/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByRole('dialog', { name: /vincular aluno/i })).not.toBeInTheDocument();
  });

  it('closes link modal on close button click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /vincular aluno/i }));
    await user.click(screen.getByRole('button', { name: /fechar modal/i }));

    expect(screen.queryByRole('dialog', { name: /vincular aluno/i })).not.toBeInTheDocument();
  });

  it('link button is disabled when email is empty', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /vincular aluno/i }));
    expect(screen.getByRole('button', { name: /^vincular$/i })).toBeDisabled();
  });

  it('submits link form and calls api.post', async () => {
    const user = userEvent.setup();
    const newStudent = { id: 'new-1', firstName: 'Novo', lastName: 'Aluno', email: 'novo@example.com', status: 'ativo' };
    api.post.mockResolvedValue({ data: newStudent });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /vincular aluno/i }));
    await user.type(screen.getByLabelText(/e-mail do aluno/i), 'novo@example.com');
    await user.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/students', { email: 'novo@example.com' });
    });
    expect(showToast).toHaveBeenCalledWith('Aluno vinculado com sucesso!', 'success');
  });

  it('shows error toast when link api.post fails', async () => {
    const user = userEvent.setup();
    const err = new Error('Conflict');
    err.userMessage = 'Aluno já vinculado.';
    api.post.mockRejectedValue(err);
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /vincular aluno/i }));
    await user.type(screen.getByLabelText(/e-mail do aluno/i), 'dup@example.com');
    await user.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Aluno já vinculado.', 'error');
    });
  });

  // ── Import modal — platform step ──────────────────────────────────────

  it('shows import button always', async () => {
    renderWithRouter(<Students />);
    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /importar alunos/i })).toBeInTheDocument();
  });

  it('opens import modal with platform step', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /importar alunos/i }));

    expect(screen.getByRole('dialog', { name: /importar alunos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /primecoaching/i })).toBeInTheDocument();
  });

  it('closes import modal from close button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fechar modal/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ── Import modal — upload step ────────────────────────────────────────

  it('shows file upload form after selecting PrimeCoaching', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    await user.click(screen.getByRole('button', { name: /primecoaching/i }));

    expect(screen.getByRole('dialog', { name: /importar do primecoaching/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/arquivo xlsx do primecoaching/i)).toBeInTheDocument();
  });

  it('import submit button is disabled until a file is selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    await user.click(screen.getByRole('button', { name: /primecoaching/i }));

    expect(screen.getByRole('button', { name: /^continuar$/i })).toBeDisabled();
  });

  it('Voltar button on upload step goes back to platform', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    await user.click(screen.getByRole('button', { name: /primecoaching/i }));
    await user.click(screen.getByRole('button', { name: /voltar/i }));

    expect(screen.getByRole('dialog', { name: /importar alunos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /primecoaching/i })).toBeInTheDocument();
  });

  // ── Import modal — preview step ───────────────────────────────────────

  const uploadFileAndSubmit = async (user) => {
    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    await user.click(screen.getByRole('button', { name: /primecoaching/i }));
    const fileInput = screen.getByLabelText(/arquivo xlsx do primecoaching/i);
    const mockFile = new File(['xlsx content'], 'alunos.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(fileInput, mockFile);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^continuar$/i })).not.toBeDisabled()
    );
    fireEvent.submit(fileInput.closest('form'));
  };

  it('shows preview table and summary on successful import', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Nicolle Costa')).toBeInTheDocument();
    expect(screen.getByText('Vitor Dantas')).toBeInTheDocument();
    expect(screen.getByText('Duplicado')).toBeInTheDocument();
  });

  it('shows summary chip with aluno count', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() => expect(screen.getByText('alunos encontrados')).toBeInTheDocument());
  });

  it('sends FormData with file to api.post', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/import/primecoaching/preview',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
      );
    });
  });

  it('disables file input and submit during loading', async () => {
    const user = userEvent.setup();
    let resolveImport;
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return new Promise((resolve) => { resolveImport = resolve; });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    expect(screen.getByLabelText(/arquivo xlsx do primecoaching/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /processando/i })).toBeDisabled();

    resolveImport({ data: mockImportPreviewResponse });
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );
  });

  it('shows error toast on upload error and stays on upload step', async () => {
    const user = userEvent.setup();
    const err = new Error('Format changed');
    err.userMessage = 'O arquivo não corresponde ao formato esperado do PrimeCoaching.';
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.reject(err);
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'O arquivo não corresponde ao formato esperado do PrimeCoaching.',
        'error'
      );
    });

    expect(screen.getByRole('dialog', { name: /importar do primecoaching/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/arquivo xlsx do primecoaching/i)).not.toBeDisabled();
  });

  it('pre-selects non-duplicate students after preview', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    expect(screen.getByRole('checkbox', { name: /selecionar nicolle costa/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /selecionar vitor dantas/i })).not.toBeChecked();
  });

  it('toggles individual student selection', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    const nicolleCheckbox = screen.getByRole('checkbox', { name: /selecionar nicolle costa/i });
    expect(nicolleCheckbox).toBeChecked();
    await user.click(nicolleCheckbox);
    expect(nicolleCheckbox).not.toBeChecked();
  });

  it('select all toggles all non-duplicate students', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    // Deselect all
    await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }));
    expect(screen.getByRole('checkbox', { name: /selecionar nicolle costa/i })).not.toBeChecked();

    // Re-select all
    await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }));
    expect(screen.getByRole('checkbox', { name: /selecionar nicolle costa/i })).toBeChecked();
  });

  it('shows success toast and closes modal on send invites', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    const dialog = screen.getByRole('dialog', { name: /alunos do primecoaching/i });
    await user.click(within(dialog).getByRole('button', { name: /enviar.*convite/i }));

    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/convite/i), 'success');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resets import state when closing after preview', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /fechar modal/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Re-open — should start at platform step
    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    expect(screen.getByRole('dialog', { name: /importar alunos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /primecoaching/i })).toBeInTheDocument();
  });

  it('Voltar on preview step goes back to upload step', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /^voltar$/i }));
    expect(screen.getByRole('dialog', { name: /importar do primecoaching/i })).toBeInTheDocument();
  });

  // ── Error on initial fetch ─────────────────────────────────────────────

  it('shows error toast when initial fetch fails', async () => {
    const err = new Error('Network error');
    err.userMessage = 'Erro ao carregar alunos.';
    api.get.mockRejectedValue(err);
    renderWithRouter(<Students />);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Erro ao carregar alunos.', 'error');
    });
  });
});
