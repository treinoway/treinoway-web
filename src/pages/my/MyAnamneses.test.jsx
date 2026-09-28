import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import MyAnamneses from './MyAnamneses';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

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
    mockNavigate.mockReset();
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

  it('navigates to the answer wizard when "Responder" is clicked', async () => {
    const user = userEvent.setup();
    setupApiMocks({ linksData: [mockLinks[0]] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Responder' }));
    expect(mockNavigate).toHaveBeenCalledWith('/my/anamneses/anamnesis-1/answer');
  });

  it('does not open an inline form or submit anything on "Responder"', async () => {
    const user = userEvent.setup();
    setupApiMocks({ linksData: [mockLinks[0]] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Responder' }));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /enviar resposta/i })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows "Atualizar resposta" and the submitted date when a response exists, and navigates to the wizard', async () => {
    const user = userEvent.setup();
    setupApiMocks({ linksData: [mockLinks[0]], responseStatus: 200 });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Atualizar resposta' })).toBeInTheDocument();
    });
    expect(screen.getByText(/Respondido em 01\/03\/2026/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atualizar resposta' }));
    expect(mockNavigate).toHaveBeenCalledWith('/my/anamneses/anamnesis-1/answer');
  });

  it('does not show "Respondido em" when there is no response yet', async () => {
    setupApiMocks({ linksData: [mockLinks[0]] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Responder' })).toBeInTheDocument();
    });
    expect(screen.queryByText(/Respondido em/)).not.toBeInTheDocument();
  });

  it('toasts when loading the response fails with a non-404 error', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/my/anamneses') return Promise.resolve({ data: [mockLinks[0]] });
      return Promise.reject({ userMessage: 'Erro ao carregar resposta', response: { status: 500 } });
    });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao carregar resposta', 'error');
    });
  });

  describe('question preview', () => {
    const previewLink = {
      ...mockLinks[0],
      anamnesis: {
        ...mockLinks[0].anamnesis,
        sections: [
          {
            id: 'sec-preview',
            title: 'Preview',
            order: 0,
            questions: [
              { id: 'p2', text: 'Quanto pesa?', type: 'numeric', required: false, order: 1, options: [], config: { min: '30', max: '', unit: 'kg' } },
              { id: 'p1', text: 'Qual turno?', type: 'single_choice', required: true, order: 0, options: [{ id: 'o1', text: 'Manhã' }, { id: 'o2', text: 'Noite' }] },
            ],
          },
        ],
      },
    };

    it('lists questions in order with type, required badge and hints', async () => {
      const user = userEvent.setup();
      setupApiMocks({ linksData: [previewLink] });
      renderWithRouter(<MyAnamneses />);
      await user.click(await screen.findByRole('button', { name: /ver perguntas/i }));
      await user.click(screen.getByRole('button', { name: /seção preview/i }));
      const first = screen.getByText(/1\. Qual turno\?/);
      const second = screen.getByText(/2\. Quanto pesa\?/);
      expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getByText('Obrigatória')).toBeInTheDocument();
      expect(screen.getByText('Manhã')).toBeInTheDocument();
      expect(screen.getByText('Mín: 30 · Unidade: kg')).toBeInTheDocument();
    });

    it('collapses a section again', async () => {
      const user = userEvent.setup();
      setupApiMocks({ linksData: [previewLink] });
      renderWithRouter(<MyAnamneses />);
      await user.click(await screen.findByRole('button', { name: /ver perguntas/i }));
      const toggle = screen.getByRole('button', { name: /seção preview/i });
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(/Qual turno\?/)).not.toBeInTheDocument();
    });
  });
});
