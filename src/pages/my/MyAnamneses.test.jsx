import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import MyAnamneses from './MyAnamneses';
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

const mockLinks = [
  {
    id: 'link-1',
    anamnesisId: 'anamnesis-1',
    studentId: 'student-1',
    trainerId: 'trainer-1',
    createdAt: '2026-01-15T10:00:00.000Z',
    anamnesis: {
      id: 'anamnesis-1',
      title: 'Anamnese de Saúde',
      description: 'Questionário completo',
      isGeneral: false,
      sections: [
        {
          id: 'section-1',
          title: 'Histórico',
          order: 0,
          questions: [
            {
              id: 'q1',
              text: 'Você tem alguma doença?',
              type: 'dichotomous',
              required: true,
              order: 0,
              options: [],
            },
          ],
        },
      ],
    },
    trainer: {
      id: 'trainer-1',
      user: { firstName: 'João', lastName: 'Silva', avatarUrl: null },
    },
  },
  {
    id: 'link-2',
    anamnesisId: 'anamnesis-2',
    studentId: 'student-1',
    trainerId: 'trainer-1',
    createdAt: '2026-02-01T08:00:00.000Z',
    anamnesis: {
      id: 'anamnesis-2',
      title: 'Anamnese Geral da Plataforma',
      description: null,
      isGeneral: true,
      sections: [],
    },
    trainer: {
      id: 'trainer-1',
      user: { firstName: 'João', lastName: 'Silva', avatarUrl: null },
    },
  },
];

const mockResponse = {
  id: 'response-1',
  anamnesisId: 'anamnesis-1',
  studentId: 'student-1',
  submittedAt: '2026-03-01T10:00:00.000Z',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: null,
  answers: [
    { id: 'ans-1', responseId: 'response-1', questionId: 'q1', value: 'yes', createdAt: '2026-03-01T10:00:00.000Z', updatedAt: null },
  ],
};

// By default, no existing responses
function setupApiMocks({ linksData = mockLinks, responseStatus = 404 } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/my/anamneses') return Promise.resolve({ data: linksData });
    if (url.startsWith('/my/anamneses/') && url.endsWith('/response')) {
      if (responseStatus === 404) {
        const err = Object.assign(new Error('Not found'), { response: { status: 404 } });
        return Promise.reject(err);
      }
      return Promise.resolve({ data: mockResponse });
    }
    return Promise.resolve({ data: [] });
  });
}

describe('MyAnamneses', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<MyAnamneses />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders page title after loading', async () => {
    setupApiMocks({ linksData: [] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Minhas Anamneses')).toBeInTheDocument();
    });
  });

  it('fetches from /my/anamneses on mount', async () => {
    setupApiMocks({ linksData: [] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/my/anamneses');
    });
  });

  it('shows empty state when no anamneses', async () => {
    setupApiMocks({ linksData: [] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Nenhuma anamnese ainda')).toBeInTheDocument();
    });
  });

  it('renders anamnesis card with title and trainer name', async () => {
    setupApiMocks();
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    expect(screen.getAllByText('João Silva').length).toBeGreaterThan(0);
  });

  it('shows "Geral" badge for general anamneses', async () => {
    setupApiMocks();
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Geral')).toBeInTheDocument();
    });
  });

  it('shows anamnesis description when present', async () => {
    setupApiMocks();
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Questionário completo')).toBeInTheDocument();
    });
  });

  it('shows formatted date for each link', async () => {
    setupApiMocks();
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      // 2026-01-15 should appear as localized date
      expect(screen.getByText(/15\/01\/2026/)).toBeInTheDocument();
    });
  });

  it('expands section accordion when "Ver perguntas" is clicked', async () => {
    const user = userEvent.setup();
    setupApiMocks();
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    // Wait for response loading to finish
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /ver perguntas/i }).length).toBeGreaterThan(0);
    });
    const expandButtons = screen.getAllByRole('button', { name: /ver perguntas/i });
    await user.click(expandButtons[0]);
    expect(screen.getByText('Histórico')).toBeInTheDocument();
  });

  it('shows section accordion after expanding the anamnesis card', async () => {
    const user = userEvent.setup();
    setupApiMocks({ linksData: [mockLinks[0]] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ver perguntas/i })).toBeInTheDocument();
    });
    const expandButton = screen.getByRole('button', { name: /ver perguntas/i });
    await user.click(expandButton);
    expect(screen.getByRole('button', { name: /seção histórico/i })).toBeInTheDocument();
  });

  it('shows error toast when fetch fails', async () => {
    const error = { userMessage: 'Erro ao carregar anamneses' };
    api.get.mockRejectedValue(error);
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao carregar anamneses', 'error');
    });
  });

  it('shows "Responder" button for each anamnesis', async () => {
    setupApiMocks({ linksData: [mockLinks[0]] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
    });
  });

  it('shows response form when "Responder" is clicked', async () => {
    const user = userEvent.setup();
    setupApiMocks({ linksData: [mockLinks[0]] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Responder' }));
    expect(screen.getByText(/Você tem alguma doença\?/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar resposta' })).toBeInTheDocument();
  });

  it('pre-fills form when existing response is loaded', async () => {
    setupApiMocks({ linksData: [mockLinks[0]], responseStatus: 200 });
    const user = userEvent.setup();
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Atualizar resposta' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Atualizar resposta' }));
    // q1 is dichotomous, answer is 'yes' — should have "Sim" radio checked
    const simRadio = screen.getByRole('radio', { name: 'Sim' });
    expect(simRadio).toBeChecked();
  });

  it('submits response and shows success toast', async () => {
    const user = userEvent.setup();
    setupApiMocks({ linksData: [mockLinks[0]] });
    api.post.mockResolvedValue({ data: mockResponse });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Responder' }));
    // Click "Sim" radio
    await user.click(screen.getByRole('radio', { name: 'Sim' }));
    await user.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/my/anamneses/anamnesis-1/response', {
        answers: [{ questionId: 'q1', value: 'yes' }],
      });
      expect(mockShowToast).toHaveBeenCalledWith('Resposta enviada com sucesso!', 'success');
    });
  });

  it('shows "Respondido em" date after successful submission', async () => {
    const user = userEvent.setup();
    setupApiMocks({ linksData: [mockLinks[0]] });
    api.post.mockResolvedValue({ data: mockResponse });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Responder' }));
    await user.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    await waitFor(() => {
      expect(screen.getByText(/Respondido em/)).toBeInTheDocument();
    });
  });

  it('shows per-question validation errors on 400 response', async () => {
    const user = userEvent.setup();
    setupApiMocks({ linksData: [mockLinks[0]] });
    const validationError = {
      response: {
        status: 400,
        data: {
          error: 'VALIDATION_ERROR',
          details: [{ questionId: 'q1', message: 'Este campo é obrigatório.' }],
        },
      },
    };
    api.post.mockRejectedValue(validationError);
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Responder' }));
    await user.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    await waitFor(() => {
      expect(screen.getByText('Este campo é obrigatório.')).toBeInTheDocument();
    });
  });
});
