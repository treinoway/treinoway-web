import userEvent from '@testing-library/user-event';
import { renderWithRouter, renderWithRoute, screen, waitFor, within } from '../../test/test-utils';
import TrainerAnamneses from './TrainerAnamneses';
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

const mockAnamneses = [
  {
    id: 'anamnesis-1',
    title: 'Anamnese Saúde Geral',
    description: 'Questionário de saúde',
    isGeneral: false,
    parentId: null,
    version: 1,
    sections: [{ id: 's1' }, { id: 's2' }],
    updatedAt: '2026-04-08T10:00:00Z',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'anamnesis-2',
    title: 'Anamnese Geral da Plataforma',
    description: null,
    isGeneral: true,
    parentId: null,
    version: 3,
    sections: [],
    updatedAt: '2026-04-12T10:00:00Z',
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'anamnesis-3',
    title: 'Anamnese Derivada',
    description: null,
    isGeneral: false,
    parentId: 'anamnesis-2',
    version: 1,
    sections: [],
    updatedAt: '2026-04-05T10:00:00Z',
    createdAt: '2026-04-05T10:00:00Z',
  },
];

describe('TrainerAnamneses', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<TrainerAnamneses />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders page title after loading', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamneses')).toBeInTheDocument();
    });
  });

  it('fetches anamneses from /trainer/anamneses on mount', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/anamneses');
    });
  });

  it('shows empty state when no anamneses', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Sem anamneses ainda')).toBeInTheDocument();
    });
  });

  it('shows CTA button in empty state that opens the create form', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Sem anamneses ainda')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /criar primeira anamnese/i }));
    expect(screen.getByLabelText(/^nome/i)).toBeInTheDocument();
  });

  it('renders 3 anamneses with correct origin badges', async () => {
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    expect(screen.getByText('Anamnese Derivada')).toBeInTheDocument();
    expect(screen.getByText('MINHA')).toBeInTheDocument();
    expect(screen.getByText('GERAL')).toBeInTheDocument();
    expect(screen.getByText('DERIVADA')).toBeInTheDocument();
  });

  it('filters to only own anamneses when "Meus" chip is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /meus/i }));

    expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    expect(screen.getByText('Anamnese Derivada')).toBeInTheDocument();
    expect(screen.queryByText('Anamnese Geral da Plataforma')).not.toBeInTheDocument();
  });

  it('filters to only general anamneses when "Gerais" chip is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /gerais/i }));

    expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    expect(screen.queryByText('Anamnese Saúde Geral')).not.toBeInTheDocument();
    expect(screen.queryByText('Anamnese Derivada')).not.toBeInTheDocument();
  });

  it('filters rows by search query (case-insensitive)', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: /buscar anamnese/i }), 'saúde');

    expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    expect(screen.queryByText('Anamnese Geral da Plataforma')).not.toBeInTheDocument();
    expect(screen.queryByText('Anamnese Derivada')).not.toBeInTheDocument();
  });

  it('navigates to anamnesis detail when row is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /abrir anamnese saúde geral/i }));

    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('opens confirm dialog when "Excluir" is clicked via row menu', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByText(/excluir "anamnese saúde geral"/i)).toBeInTheDocument();
  });

  it('calls DELETE and shows toast after confirm delete', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.delete.mockResolvedValue({});
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }),
    );

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1');
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese excluída com sucesso!', 'success');
    });
  });

  it('does not call DELETE when cancel is clicked in confirm dialog', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('calls fork endpoint and navigates on "Nova versão"', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.post.mockResolvedValue({ data: { id: 'forked-id' } });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Nova versão' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1/fork');
      expect(mockShowToast).toHaveBeenCalledWith('Nova versão criada com sucesso!', 'success');
    });
    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('submitting create form calls POST and navigates to new anamnesis', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { id: 'new-id' } });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /criar primeira anamnese/i }));
    await user.type(screen.getByLabelText(/^nome/i), 'Nova Anamnese Teste');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses',
        expect.objectContaining({ title: 'Nova Anamnese Teste' }),
      );
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese criada com sucesso!', 'success');
    });
    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('shows the edit form prefilled when "Editar" is clicked via row menu', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));

    expect(screen.getByDisplayValue('Anamnese Saúde Geral')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Questionário de saúde')).toBeInTheDocument();
  });

  it('submits update and shows success toast', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.patch.mockResolvedValue({ data: {} });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1',
        expect.any(Object),
      );
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese atualizada com sucesso!', 'success');
    });
  });

  it('shows error toast when fetch fails', async () => {
    const error = { userMessage: 'Erro ao carregar' };
    api.get.mockRejectedValue(error);
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao carregar', 'error');
    });
  });

  it('shows version badge for every anamnesis', async () => {
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    // version badges: v1 (×2 own + derived), v3 (general)
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getAllByText('v1').length).toBeGreaterThanOrEqual(2);
  });

  it('general anamnesis does not show "Nova versão" option', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Geral da Plataforma' }));
    expect(screen.queryByRole('button', { name: 'Nova versão' })).not.toBeInTheDocument();
  });
});

const ownAnamnesis = mockAnamneses[0];

const catalogTemplates = [
  {
    id: 'tpl-screening',
    title: 'Triagem PAR-Q',
    description: 'Prontidão para atividade física',
    isGeneral: true,
    parentId: null,
    version: 1,
    category: 'screening',
    categoryLabel: 'Triagem',
    questionCount: 7,
    sections: [],
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'tpl-hypertrophy',
    title: 'Hipertrofia iniciante',
    description: null,
    isGeneral: true,
    parentId: null,
    version: 1,
    category: 'hypertrophy',
    categoryLabel: 'Hipertrofia',
    questionCount: 12,
    sections: [],
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'tpl-uncategorized',
    title: 'Anamnese da plataforma',
    description: null,
    isGeneral: true,
    parentId: null,
    version: 2,
    category: null,
    categoryLabel: null,
    questionCount: 20,
    sections: [],
    createdAt: '2026-01-01T10:00:00Z',
  },
];

const screeningDetail = {
  id: 'tpl-screening',
  title: 'Triagem PAR-Q',
  description: 'Prontidão para atividade física',
  sections: [
    {
      id: 'sec-1',
      title: 'Histórico de saúde',
      order: 0,
      questions: [
        { id: 'q-1', text: 'Algum médico já disse que você tem problema cardíaco?', type: 'dichotomous', required: true, order: 0 },
        { id: 'q-2', text: 'Sente dor no peito ao se exercitar?', type: 'dichotomous', required: true, order: 1 },
      ],
    },
    {
      id: 'sec-2',
      title: 'Hábitos',
      order: 1,
      questions: [
        { id: 'q-3', text: 'Quantas horas você dorme?', type: 'numeric', required: false, order: 0 },
        { id: 'q-4', text: 'Conte sobre sua rotina', type: 'free_text', required: false, order: 1 },
      ],
    },
  ],
};

const mockGetByUrl = ({ list = [ownAnamnesis, ...catalogTemplates], detail = screeningDetail } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/anamneses') return Promise.resolve({ data: list });
    if (url === `/trainer/anamneses/${detail.id}`) return Promise.resolve({ data: detail });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

const renderPage = () =>
  renderWithRoute(<TrainerAnamneses />, { route: '/trainer/anamneses', path: '/trainer/anamneses' });

const waitForList = () =>
  waitFor(() => expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument());

const openGallery = async (user) => {
  await user.click(screen.getByRole('button', { name: /nova anamnese/i }));
  await user.click(screen.getByRole('tab', { name: 'Usar um modelo' }));
};

const getCard = (title) => screen.getByRole('article', { name: title });

describe('TrainerAnamneses — "Nova anamnese" and template gallery', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('"Nova anamnese" opens the toggle on "Criar do zero" and switches to the gallery and back', async () => {
    const user = userEvent.setup();
    mockGetByUrl();
    renderPage();
    await waitForList();

    await user.click(screen.getByRole('button', { name: /nova anamnese/i }));

    expect(screen.getByRole('tab', { name: 'Criar do zero' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/^nome/i)).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Usar um modelo' }));

    expect(screen.getByRole('tab', { name: 'Usar um modelo' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText(/^nome/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);

    await user.click(screen.getByRole('tab', { name: 'Criar do zero' }));
    expect(screen.getByLabelText(/^nome/i)).toBeInTheDocument();
  });

  it('lists every general anamnesis, with or without category, and never the trainer\'s own', async () => {
    const user = userEvent.setup();
    mockGetByUrl();
    renderPage();
    await waitForList();
    await openGallery(user);

    expect(getCard('Triagem PAR-Q')).toHaveTextContent('7 perguntas');
    expect(getCard('Hipertrofia iniciante')).toHaveTextContent('12 perguntas');
    expect(getCard('Anamnese da plataforma')).toHaveTextContent('20 perguntas');
    expect(screen.queryByRole('article', { name: ownAnamnesis.title })).not.toBeInTheDocument();
  });

  it('filters the gallery by category chip', async () => {
    const user = userEvent.setup();
    mockGetByUrl();
    renderPage();
    await waitForList();
    await openGallery(user);

    const chips = screen.getByRole('group', { name: 'Filtrar modelos por categoria' });
    await user.click(within(chips).getByRole('button', { name: 'Triagem' }));

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(getCard('Triagem PAR-Q')).toBeInTheDocument();

    await user.click(within(chips).getByRole('button', { name: 'Todos' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('renders items from the older API (no category/questionCount) without chips or "undefined"', async () => {
    const user = userEvent.setup();
    mockGetByUrl({ list: mockAnamneses });
    renderPage();
    await waitForList();
    await openGallery(user);

    expect(getCard('Anamnese Geral da Plataforma')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Filtrar modelos por categoria' })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/undefined|NaN/);
  });

  it('loads the preview lazily and shows numbered sections, count and estimated time', async () => {
    const user = userEvent.setup();
    mockGetByUrl();
    renderPage();
    await waitForList();
    await openGallery(user);

    expect(api.get).not.toHaveBeenCalledWith('/trainer/anamneses/tpl-screening');

    await user.click(within(getCard('Triagem PAR-Q')).getByRole('button', { name: 'Pré-visualizar' }));

    expect(api.get).toHaveBeenCalledWith('/trainer/anamneses/tpl-screening');
    const dialog = await screen.findByRole('dialog', { name: 'Triagem PAR-Q' });
    // 2 closed × 10 s + 1 numeric × 15 s + 1 free text × 40 s = 75 s → 2 min
    expect(await within(dialog).findByText('4 perguntas · Cerca de 2 min')).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Histórico de saúde' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Hábitos' })).toBeInTheDocument();
    expect(within(dialog).getByText('Sente dor no peito ao se exercitar?')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Fechar pré-visualização' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toasts and closes the preview when it fails to load', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) =>
      url === '/trainer/anamneses'
        ? Promise.resolve({ data: catalogTemplates })
        : Promise.reject({ userMessage: 'Modelo indisponível' }),
    );
    renderPage();
    await waitForList();
    await openGallery(user);

    await user.click(within(getCard('Triagem PAR-Q')).getByRole('button', { name: 'Pré-visualizar' }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Modelo indisponível', 'error'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('goes from "Nova anamnese" to the editor of the copy in 3 taps', async () => {
    const user = userEvent.setup();
    mockGetByUrl();
    api.post.mockResolvedValue({ data: { id: 'copy-id' } });
    renderPage();
    await waitForList();

    await user.click(screen.getByRole('button', { name: /nova anamnese/i }));
    await user.click(screen.getByRole('tab', { name: 'Usar um modelo' }));
    await user.click(within(getCard('Hipertrofia iniciante')).getByRole('button', { name: 'Usar este modelo' }));

    expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/tpl-hypertrophy/copy');
    expect(api.post.mock.calls[0]).toHaveLength(1);
    await waitFor(() => expect(screen.getByTestId('redirected')).toBeInTheDocument());
    expect(mockShowToast).toHaveBeenCalledWith('Anamnese criada a partir do modelo.', 'success');
  });

  it('copies from the preview CTA and navigates to the editor', async () => {
    const user = userEvent.setup();
    mockGetByUrl();
    api.post.mockResolvedValue({ data: { id: 'copy-id' } });
    renderPage();
    await waitForList();
    await openGallery(user);

    await user.click(within(getCard('Triagem PAR-Q')).getByRole('button', { name: 'Pré-visualizar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Triagem PAR-Q' });
    await within(dialog).findByText('Histórico de saúde');
    await user.click(within(dialog).getByRole('button', { name: 'Usar este modelo' }));

    expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/tpl-screening/copy');
    await waitFor(() => expect(screen.getByTestId('redirected')).toBeInTheDocument());
  });

  it('shows "Carregando..." and disables the gallery while copying', async () => {
    const user = userEvent.setup();
    mockGetByUrl();
    api.post.mockImplementation(() => new Promise(() => {}));
    renderPage();
    await waitForList();
    await openGallery(user);

    await user.click(within(getCard('Triagem PAR-Q')).getByRole('button', { name: 'Usar este modelo' }));

    expect(within(getCard('Triagem PAR-Q')).getByRole('button', { name: 'Carregando...' })).toBeDisabled();
    expect(within(getCard('Hipertrofia iniciante')).getByRole('button', { name: 'Usar este modelo' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Criar do zero' })).toBeDisabled();
  });

  it('toasts on copy failure and keeps the gallery usable', async () => {
    const user = userEvent.setup();
    mockGetByUrl();
    api.post.mockRejectedValue({ userMessage: 'Não foi possível copiar' });
    renderPage();
    await waitForList();
    await openGallery(user);

    await user.click(within(getCard('Triagem PAR-Q')).getByRole('button', { name: 'Usar este modelo' }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Não foi possível copiar', 'error'));
    expect(screen.queryByTestId('redirected')).not.toBeInTheDocument();
    expect(within(getCard('Triagem PAR-Q')).getByRole('button', { name: 'Usar este modelo' })).toBeEnabled();
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('shows "Nenhum modelo ainda" with a shortcut to "Criar do zero"', async () => {
    const user = userEvent.setup();
    mockGetByUrl({ list: [ownAnamnesis] });
    renderPage();
    await waitForList();
    await openGallery(user);

    expect(screen.getByText('Nenhum modelo ainda')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar do zero' }));

    expect(screen.getByRole('tab', { name: 'Criar do zero' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/^nome/i)).toBeInTheDocument();
  });

  it('shows the error state in the gallery when the list failed and retries', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValueOnce({ userMessage: 'Falha de rede' }).mockResolvedValue({ data: catalogTemplates });
    renderPage();
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Falha de rede', 'error'));

    await user.click(screen.getByRole('button', { name: /criar primeira anamnese/i }));
    await user.click(screen.getByRole('tab', { name: 'Usar um modelo' }));
    expect(screen.getByText('Não foi possível carregar os modelos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3));
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('closes the panel from the close button', async () => {
    const user = userEvent.setup();
    mockGetByUrl();
    renderPage();
    await waitForList();
    await openGallery(user);

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('tab', { name: 'Usar um modelo' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /buscar anamnese/i })).toBeInTheDocument();
  });
});

describe('TrainerAnamneses — "Salvar como modelo"', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  const openSaveAs = async (user, title) => {
    await user.click(screen.getByRole('button', { name: `Opções de ${title}` }));
    await user.click(screen.getByRole('button', { name: 'Salvar como modelo' }));
    return screen.getByRole('dialog', { name: 'Salvar como modelo' });
  };

  it('copies with the given name, toasts and reloads the list', async () => {
    const user = userEvent.setup();
    const copied = { ...ownAnamnesis, id: 'copy-id', title: 'Triagem da academia', parentId: null };
    api.get
      .mockResolvedValueOnce({ data: mockAnamneses })
      .mockResolvedValue({ data: [...mockAnamneses, copied] });
    api.post.mockResolvedValue({ data: copied });
    renderWithRouter(<TrainerAnamneses />);
    await waitForList();

    const dialog = await openSaveAs(user, 'Anamnese Saúde Geral');
    const input = within(dialog).getByLabelText(/nome do modelo/i);
    expect(input).toHaveValue('Cópia de Anamnese Saúde Geral');
    await user.clear(input);
    await user.type(input, 'Triagem da academia');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1/copy', { title: 'Triagem da academia' });
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Modelo "Triagem da academia" salvo.', 'success'));
    expect(await screen.findByText('Triagem da academia')).toBeInTheDocument();
    expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is available on general anamneses and keeps the pre-filled name', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.post.mockResolvedValue({ data: { id: 'copy-id' } });
    renderWithRouter(<TrainerAnamneses />);
    await waitForList();

    const dialog = await openSaveAs(user, 'Anamnese Geral da Plataforma');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-2/copy', {
      title: 'Cópia de Anamnese Geral da Plataforma',
    });
  });

  it('makes no call when cancelled', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitForList();

    const dialog = await openSaveAs(user, 'Anamnese Saúde Geral');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('blocks an empty name with an inline error', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitForList();

    const dialog = await openSaveAs(user, 'Anamnese Saúde Geral');
    const input = within(dialog).getByLabelText(/nome do modelo/i);
    await user.clear(input);
    await user.type(input, '   ');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Informe um nome para o modelo.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows "Carregando..." while the copy is in flight', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.post.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<TrainerAnamneses />);
    await waitForList();

    const dialog = await openSaveAs(user, 'Anamnese Saúde Geral');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(within(dialog).getByRole('button', { name: 'Carregando...' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('toasts on failure and keeps the dialog open with the typed name', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.post.mockRejectedValue({ userMessage: 'Não foi possível salvar' });
    renderWithRouter(<TrainerAnamneses />);
    await waitForList();

    const dialog = await openSaveAs(user, 'Anamnese Saúde Geral');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Não foi possível salvar', 'error'));
    expect(within(dialog).getByLabelText(/nome do modelo/i)).toHaveValue('Cópia de Anamnese Saúde Geral');
    expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeEnabled();
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
