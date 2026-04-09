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

  it('shows empty state with icon and CTA when there are no students', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Students />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum aluno vinculado ainda')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /vincular primeiro aluno/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /vincular primeiro aluno/i }));

    expect(screen.getByRole('heading', { name: 'Vincular Aluno' })).toBeInTheDocument();
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
    const mockFile = new File(['xlsx content'], 'alunos.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const uploadFileAndSubmit = async (user) => {
      await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      const fileInput = screen.getByLabelText(/arquivo xlsx do primecoaching/i);
      await user.upload(fileInput, mockFile);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /^importar$/i })).not.toBeDisabled()
      );
      fireEvent.submit(fileInput.closest('form'));
    };

    it('shows the import button', async () => {
      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /importar alunos/i })).toBeInTheDocument();
    });

    it('opens the import modal with platform selection when clicking the import button', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));

      expect(screen.getByRole('heading', { name: 'Importar Alunos' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /primecoaching/i })).toBeInTheDocument();
    });

    it('shows file upload form after selecting PrimeCoaching platform', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));

      expect(screen.queryByLabelText(/arquivo xlsx/i)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /primecoaching/i }));

      expect(screen.getByLabelText(/arquivo xlsx do primecoaching/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Importar do PrimeCoaching' })).toBeInTheDocument();
    });

    it('closes the import modal when clicking cancel', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));
      expect(screen.getByRole('heading', { name: 'Importar do PrimeCoaching' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancelar/i }));
      expect(screen.queryByRole('heading', { name: 'Importar do PrimeCoaching' })).not.toBeInTheDocument();
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

    it('import button is disabled until a file is selected', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /importar alunos/i }));
      await user.click(screen.getByRole('button', { name: /primecoaching/i }));

      expect(screen.getByRole('button', { name: /^importar$/i })).toBeDisabled();
    });

    it('disables file input and submit button during loading', async () => {
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

      await uploadFileAndSubmit(user);

      expect(screen.getByLabelText(/arquivo xlsx do primecoaching/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /processando arquivo/i })).toBeDisabled();

      await waitFor(() => {
        resolveImport({ data: mockImportPreviewResponse });
        return Promise.resolve();
      });
      await waitFor(() => expect(screen.getByText('Alunos do PrimeCoaching')).toBeInTheDocument());
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

      await uploadFileAndSubmit(user);

      await waitFor(() => {
        expect(screen.getByText('Alunos do PrimeCoaching')).toBeInTheDocument();
      });

      expect(screen.getByText('2 alunos encontrados')).toBeInTheDocument();
      expect(screen.getByText('1 duplicado')).toBeInTheDocument();
      expect(screen.getByText('Nicolle Costa')).toBeInTheDocument();
      expect(screen.getByText('Vitor Dantas')).toBeInTheDocument();
      expect(screen.getByText('Duplicado')).toBeInTheDocument();
    });

    it('sends FormData with the file to the API', async () => {
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

      await uploadFileAndSubmit(user);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/import/primecoaching/preview',
          expect.any(FormData),
          expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
        );
      });
    });

    it('shows error toast on format changed error', async () => {
      const user = userEvent.setup();
      const formatError = new Error('Format changed');
      formatError.userMessage = 'O arquivo não corresponde ao formato esperado do PrimeCoaching. Verifique se você exportou a planilha correta.';
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.reject(formatError);
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await uploadFileAndSubmit(user);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          'O arquivo não corresponde ao formato esperado do PrimeCoaching. Verifique se você exportou a planilha correta.',
          'error'
        );
      });
    });

    it('shows error toast on generic upload error', async () => {
      const user = userEvent.setup();
      const genericError = new Error('Bad request');
      genericError.userMessage = 'Dados inválidos. Verifique os campos e tente novamente.';
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.reject(genericError);
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await uploadFileAndSubmit(user);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          'Dados inválidos. Verifique os campos e tente novamente.',
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

      await uploadFileAndSubmit(user);

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

      await uploadFileAndSubmit(user);

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

      await uploadFileAndSubmit(user);

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

      await uploadFileAndSubmit(user);

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

      await uploadFileAndSubmit(user);

      await waitFor(() => expect(screen.getByText('Alunos do PrimeCoaching')).toBeInTheDocument());

      const modal = screen.getByText('Alunos do PrimeCoaching').closest('.bottom-sheet');
      await user.click(within(modal).getByRole('button', { name: /enviar convite/i }));

      expect(showToast).toHaveBeenCalledWith('Convite enviado com sucesso!', 'success');
      expect(screen.queryByText('Alunos do PrimeCoaching')).not.toBeInTheDocument();
    });

    it('stays on upload step after error and re-enables form', async () => {
      const user = userEvent.setup();
      const uploadError = new Error('Format changed');
      uploadError.userMessage = 'O arquivo não corresponde ao formato esperado do PrimeCoaching.';
      api.post.mockImplementation((url) => {
        if (url === '/trainer/import/primecoaching/preview') {
          return Promise.reject(uploadError);
        }
        return Promise.resolve({ data: {} });
      });

      renderWithRouter(<Students />);

      await waitFor(() => {
        expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
      });

      await uploadFileAndSubmit(user);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalled();
      });

      expect(screen.getByRole('heading', { name: 'Importar do PrimeCoaching' })).toBeInTheDocument();
      expect(screen.getByLabelText(/arquivo xlsx do primecoaching/i)).not.toBeDisabled();
    });
  });
});
