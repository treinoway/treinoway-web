import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import AnamnesisDetail from './AnamnesisDetail';
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

const mockShowToast = vi.fn();

const mockAnamnesis = {
  id: 'anamnesis-1',
  title: 'Anamnese de Saúde',
  description: 'Descrição da anamnese',
  isGeneral: false,
  version: 1,
  parentId: null,
  sections: [
    {
      id: 'section-1',
      title: 'Histórico de Saúde',
      order: 0,
      questions: [
        {
          id: 'q1',
          text: 'Você tem alguma doença crônica?',
          type: 'dichotomous',
          required: true,
          order: 0,
          options: [],
        },
        {
          id: 'q2',
          text: 'Qual seu nível de dor?',
          type: 'numeric',
          required: false,
          order: 1,
          config: { min: 0, max: 10 },
          options: [],
        },
      ],
    },
  ],
};

const mockGeneralAnamnesis = {
  ...mockAnamnesis,
  id: 'anamnesis-2',
  title: 'Anamnese Geral',
  isGeneral: true,
};

function renderAnamnesisDetail(anamnesisId = 'anamnesis-1') {
  return renderWithRoute(<AnamnesisDetail />, {
    route: `/trainer/anamneses/${anamnesisId}`,
    path: '/trainer/anamneses/:anamnesisId',
  });
}

describe('AnamnesisDetail', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderAnamnesisDetail();
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders anamnesis title and description after loading', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    expect(screen.getByText('Descrição da anamnese')).toBeInTheDocument();
  });

  it('fetches anamnesis from correct endpoint', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail('anamnesis-1');
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1');
    });
  });

  it('renders section title', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument();
    });
  });

  it('shows "Geral" badge and read-only notice for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => {
      expect(screen.getByText('Geral')).toBeInTheDocument();
      expect(screen.getByText(/não pode ser editada/i)).toBeInTheDocument();
    });
  });

  it('shows "Adicionar seção" button for non-general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('+ Adicionar seção')).toBeInTheDocument();
    });
  });

  it('hides "Adicionar seção" button for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => {
      expect(screen.getByText('Anamnese Geral')).toBeInTheDocument();
    });
    expect(screen.queryByText('+ Adicionar seção')).not.toBeInTheDocument();
  });

  it('shows section form when "Adicionar seção" is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('+ Adicionar seção')).toBeInTheDocument();
    });
    await user.click(screen.getByText('+ Adicionar seção'));
    expect(screen.getByLabelText('Título da seção')).toBeInTheDocument();
  });

  it('submits new section and shows success toast', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.post.mockResolvedValue({ data: {} });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('+ Adicionar seção')).toBeInTheDocument();
    });
    await user.click(screen.getByText('+ Adicionar seção'));
    await user.type(screen.getByLabelText('Título da seção'), 'Atividade Física');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1/sections',
        expect.objectContaining({ title: 'Atividade Física' }),
      );
      expect(mockShowToast).toHaveBeenCalledWith('Seção adicionada com sucesso!', 'success');
    });
  });

  it('shows confirm dialog when "Excluir seção" is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('Histórico de Saúde')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /excluir seção histórico de saúde/i }));
    expect(screen.getByText(/excluir a seção "histórico de saúde"/i)).toBeInTheDocument();
  });

  it('deletes section after confirm and shows success toast', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.delete.mockResolvedValue({});
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /excluir seção histórico de saúde/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /excluir seção histórico de saúde/i }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1/sections/section-1');
      expect(mockShowToast).toHaveBeenCalledWith('Seção excluída com sucesso!', 'success');
    });
  });

  it('renders back button to /trainer/anamneses', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voltar para anamneses/i })).toBeInTheDocument();
    });
  });

  it('shows toast on fetch error and does not crash', async () => {
    const error = { userMessage: 'Anamnese não encontrada.' };
    api.get.mockRejectedValue(error);
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese não encontrada.', 'error');
    });
  });

  it('shows fork button for non-general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Criar nova versão' })).toBeInTheDocument();
    });
  });

  it('hides fork button for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => {
      expect(screen.getByText('Anamnese Geral')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Criar nova versão' })).not.toBeInTheDocument();
  });

  it('calls fork endpoint and navigates on success', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    api.post.mockResolvedValue({ data: { id: 'forked-anamnesis-id' } });
    renderAnamnesisDetail('anamnesis-1');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Criar nova versão' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Criar nova versão' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1/fork');
      expect(mockShowToast).toHaveBeenCalledWith('Nova versão criada com sucesso!', 'success');
    });
  });

  it('shows version badge when version > 1', async () => {
    const versionedAnamnesis = { ...mockAnamnesis, version: 2 };
    api.get.mockResolvedValue({ data: versionedAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('v2')).toBeInTheDocument();
    });
  });

  it('shows "Copiar para minha coleção" button for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copiar para minha coleção/i })).toBeInTheDocument();
    });
  });

  it('hides copy button for non-general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockAnamnesis });
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /copiar para minha coleção/i })).not.toBeInTheDocument();
  });

  it('calls copy endpoint and navigates on success', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    api.post.mockResolvedValue({ data: { id: 'copied-id' } });
    renderWithRoute(<AnamnesisDetail />, {
      route: '/trainer/anamneses/anamnesis-2',
      path: '/trainer/anamneses/:anamnesisId',
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copiar para minha coleção/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /copiar para minha coleção/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-2/copy');
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese copiada com sucesso!', 'success');
    });
  });

  it('shows copy error toast when copy fails', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockGeneralAnamnesis });
    const error = { userMessage: 'Erro ao copiar' };
    api.post.mockRejectedValue(error);
    renderAnamnesisDetail('anamnesis-2');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copiar para minha coleção/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /copiar para minha coleção/i }));
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao copiar', 'error');
    });
  });

  it('shows fork conflict dialog when adding section returns 409 ANAMNESIS_HAS_STUDENT_LINKS', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    const conflictError = {
      response: {
        status: 409,
        data: { error: 'ANAMNESIS_HAS_STUDENT_LINKS' },
      },
    };
    api.post.mockRejectedValue(conflictError);
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('+ Adicionar seção')).toBeInTheDocument();
    });
    await user.click(screen.getByText('+ Adicionar seção'));
    await user.type(screen.getByLabelText('Título da seção'), 'Nova Seção');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => {
      expect(screen.getByText(/vinculada a alunos/i)).toBeInTheDocument();
    });
  });

  it('dismisses fork conflict dialog on cancel', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    const conflictError = {
      response: {
        status: 409,
        data: { error: 'ANAMNESIS_HAS_STUDENT_LINKS' },
      },
    };
    api.post.mockRejectedValue(conflictError);
    renderAnamnesisDetail();
    await waitFor(() => {
      expect(screen.getByText('+ Adicionar seção')).toBeInTheDocument();
    });
    await user.click(screen.getByText('+ Adicionar seção'));
    await user.type(screen.getByLabelText('Título da seção'), 'Nova Seção');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => {
      expect(screen.getByText(/vinculada a alunos/i)).toBeInTheDocument();
    });
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancelar' });
    await user.click(cancelButtons[cancelButtons.length - 1]);
    expect(screen.queryByText(/vinculada a alunos/i)).not.toBeInTheDocument();
  });

  it('calls fork endpoint from conflict dialog and navigates', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamnesis });
    const conflictError = {
      response: {
        status: 409,
        data: { error: 'ANAMNESIS_HAS_STUDENT_LINKS' },
      },
    };
    api.post
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce({ data: { id: 'forked-from-conflict' } });
    renderWithRoute(<AnamnesisDetail />, {
      route: '/trainer/anamneses/anamnesis-1',
      path: '/trainer/anamneses/:anamnesisId',
    });
    await waitFor(() => {
      expect(screen.getByText('+ Adicionar seção')).toBeInTheDocument();
    });
    await user.click(screen.getByText('+ Adicionar seção'));
    await user.type(screen.getByLabelText('Título da seção'), 'Nova Seção');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    await waitFor(() => {
      expect(screen.getByText(/vinculada a alunos/i)).toBeInTheDocument();
    });
    const forkButtons = screen.getAllByRole('button', { name: 'Criar nova versão' });
    await user.click(forkButtons[forkButtons.length - 1]);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1/fork');
      expect(mockShowToast).toHaveBeenCalledWith('Nova versão criada com sucesso!', 'success');
    });
  });
});
