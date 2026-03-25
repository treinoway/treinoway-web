import { screen, waitFor, within } from '@testing-library/react';
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

const mockStudents = [
  { id: 'student-1', firstName: 'Aluno', lastName: 'Exemplo', email: 'aluno@example.com' },
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
  });

  it('shows "Ver Perfil" link in student row menu', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => {
      expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ações do aluno/i }));

    const verPerfilLink = screen.getByRole('link', { name: /ver perfil/i });
    expect(verPerfilLink).toBeInTheDocument();
    expect(verPerfilLink).toHaveAttribute('href', '/trainer/students/student-1');
  });

  it('shows "Criar Rotina" link in student row menu', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => {
      expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ações do aluno/i }));

    const createProtocolLink = screen.getByRole('link', { name: /criar rotina/i });
    expect(createProtocolLink).toBeInTheDocument();
    expect(createProtocolLink).toHaveAttribute('href', '/trainer/protocols/new?studentId=student-1');
  });

  describe('Import from PrimeCoaching', () => {
    it('shows the import button', async () => {
      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /importar alunos/i })).toBeInTheDocument();
    });

    it('opens the import modal when clicking the import button', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));

      expect(screen.getByRole('heading', { name: 'Importar Alunos' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /primecoaching/i })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /primecoaching/i }));

      expect(screen.getByLabelText('E-mail do PrimeCoaching')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha do PrimeCoaching')).toBeInTheDocument();
    });

    it('shows platform selection before credentials form', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));

      expect(screen.getByRole('button', { name: /primecoaching/i })).toBeInTheDocument();
      expect(screen.queryByLabelText('E-mail do PrimeCoaching')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /primecoaching/i }));

      expect(screen.getByLabelText('E-mail do PrimeCoaching')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha do PrimeCoaching')).toBeInTheDocument();
    });

    it('closes the import modal when clicking cancel', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      expect(screen.getByText('Importar do PrimeCoaching')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancelar/i }));
      expect(screen.queryByText('Importar do PrimeCoaching')).not.toBeInTheDocument();
    });

    it('closes the import modal when clicking the close button', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      expect(screen.getByRole('heading', { name: 'Importar Alunos' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /fechar/i }));
      expect(screen.queryByRole('heading', { name: 'Importar Alunos' })).not.toBeInTheDocument();
    });

    it('disables form inputs and buttons during loading', async () => {
      const user = userEvent.setup();
      let resolveImport;
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return new Promise((resolve) => {
            resolveImport = resolve;
          });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'password123');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      expect(screen.getByLabelText('E-mail do PrimeCoaching')).toBeDisabled();
      expect(screen.getByLabelText('Senha do PrimeCoaching')).toBeDisabled();
      expect(screen.getByRole('button', { name: /conectando ao primecoaching/i })).toBeDisabled();

      resolveImport({ data: mockImportPreviewResponse });
    });

    it('shows preview table and summary on successful import', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.resolve({ data: mockImportPreviewResponse });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'password123');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      await waitFor(() => {
        expect(screen.getByText('Alunos do PrimeCoaching')).toBeInTheDocument();
      });

      expect(screen.getByText('2 alunos encontrados')).toBeInTheDocument();
      expect(screen.getByText('1 duplicado')).toBeInTheDocument();
      expect(screen.getByText('Nicolle Costa')).toBeInTheDocument();
      expect(screen.getByText('Vitor Dantas')).toBeInTheDocument();
      expect(screen.getByText('Duplicado')).toBeInTheDocument();
    });

    it('sends correct credentials to the API', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.resolve({ data: mockImportPreviewResponse });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'trainer@pc.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'mypassword');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      expect(api.post).toHaveBeenCalledWith('/trainer/import/primecoaching/preview', {
        email: 'trainer@pc.com',
        password: 'mypassword',
      });
    });

    it('shows error toast on auth failure', async () => {
      const user = userEvent.setup();
      const authError = new Error('Auth failed');
      authError.userMessage = 'Credenciais incorretas. Verifique seu e-mail e senha do PrimeCoaching.';
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.reject(authError);
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'wrong@email.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          'Credenciais incorretas. Verifique seu e-mail e senha do PrimeCoaching.',
          'error'
        );
      });
    });

    it('shows error toast on service unavailable', async () => {
      const user = userEvent.setup();
      const serviceError = new Error('Service unavailable');
      serviceError.userMessage = 'Não foi possível conectar ao PrimeCoaching. Tente novamente em alguns minutos.';
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.reject(serviceError);
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'password');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          'Não foi possível conectar ao PrimeCoaching. Tente novamente em alguns minutos.',
          'error'
        );
      });
    });

    it('resets state when closing after preview', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.resolve({ data: mockImportPreviewResponse });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'password123');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      await waitFor(() => {
        expect(screen.getByText('Alunos do PrimeCoaching')).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByRole('button', { name: /fechar/i });
      await user.click(closeButtons[closeButtons.length - 1]);

      expect(screen.queryByText('Alunos do PrimeCoaching')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      expect(screen.getByRole('heading', { name: 'Importar Alunos' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /primecoaching/i })).toBeInTheDocument();
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
      await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'password123');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      await waitFor(() => expect(screen.getByText('Alunos do PrimeCoaching')).toBeInTheDocument());

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
      await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'password123');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      await waitFor(() => expect(screen.getByText('Alunos do PrimeCoaching')).toBeInTheDocument());

      const nicolleCheckbox = screen.getByRole('checkbox', { name: /selecionar nicolle costa/i });
      expect(nicolleCheckbox).toBeChecked();
      await user.click(nicolleCheckbox);
      expect(nicolleCheckbox).not.toBeChecked();
    });

    it('select all checkbox selects all students', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.resolve({ data: mockImportPreviewResponse });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);
      await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'password123');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      await waitFor(() => expect(screen.getByText('Alunos do PrimeCoaching')).toBeInTheDocument());

      await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }));
      expect(screen.getByRole('checkbox', { name: /selecionar nicolle costa/i })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: /selecionar vitor dantas/i })).not.toBeChecked();

      await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }));
      expect(screen.getByRole('checkbox', { name: /selecionar nicolle costa/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /selecionar vitor dantas/i })).toBeChecked();
    });

    it('shows success toast and closes modal when clicking send invite button', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.resolve({ data: mockImportPreviewResponse });
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);
      await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'password123');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      await waitFor(() => expect(screen.getByText('Alunos do PrimeCoaching')).toBeInTheDocument());

      const modal = screen.getByText('Alunos do PrimeCoaching').closest('.bottom-sheet');
      await user.click(within(modal).getByRole('button', { name: /enviar convite/i }));

      expect(showToast).toHaveBeenCalledWith('Convite enviado com sucesso!', 'success');
      expect(screen.queryByText('Alunos do PrimeCoaching')).not.toBeInTheDocument();
    });

    it('stays on credentials step after error and re-enables form', async () => {
      const user = userEvent.setup();
      const authError = new Error('Auth failed');
      authError.userMessage = 'Credenciais incorretas.';
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.reject(authError);
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      await user.type(screen.getByLabelText('E-mail do PrimeCoaching'), 'wrong@email.com');
      await user.type(screen.getByLabelText('Senha do PrimeCoaching'), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /^importar$/i }));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalled();
      });

      expect(screen.getByText('Importar do PrimeCoaching')).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail do PrimeCoaching')).not.toBeDisabled();
      expect(screen.getByLabelText('Senha do PrimeCoaching')).not.toBeDisabled();
    });
  });
});
