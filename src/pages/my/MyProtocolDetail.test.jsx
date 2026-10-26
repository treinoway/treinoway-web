import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import MyProtocolDetail from './MyProtocolDetail';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockProtocolData = {
  id: 1,
  status: 'ACTIVE',
  startDate: '2024-01-01',
  expirationDate: '2024-03-31',
  trainer: { firstName: 'Trainer', lastName: 'Silva' },
};

const mockTrainings = [
  {
    id: 10,
    name: 'Treino A',
    description: 'Aquecimento e força',
    order: 1,
    weekDay: 'MONDAY',
    notes: 'Fazer alongamento antes',
  },
  {
    id: 11,
    name: 'Treino B',
    description: 'Cardio e resistência',
    order: 2,
    notes: null,
  },
];

const mockExercisesA = [
  {
    id: 100,
    name: 'Supino Reto',
    type: 'strength',
    sets: 4,
    repetitions: { min: 8, max: 12 },
    hasLoad: true,
    suggestedLoad: 60,
    notes: 'Manter cotovelos alinhados',
    videoUrl: 'https://www.youtube.com/watch?v=abc123',
    order: 1,
  },
  {
    id: 101,
    name: 'Rosca Direta',
    type: 'strength',
    sets: 3,
    repetitions: { min: 10, max: 10 },
    hasLoad: false,
    suggestedLoad: null,
    notes: null,
    videoUrl: null,
    order: 2,
  },
];

const mockExercisesB = [];

function setupApiMocks({ protocol = mockProtocolData, trainings = mockTrainings, exercisesMap = { 10: mockExercisesA, 11: mockExercisesB } } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/my/protocols/1') {
      return Promise.resolve({ data: protocol });
    }
    if (url === '/my/protocols/1/trainings') {
      return Promise.resolve({ data: trainings });
    }
    const exerciseMatch = url.match(/^\/my\/trainings\/(\d+)\/exercises$/);
    if (exerciseMatch) {
      const trainingId = Number(exerciseMatch[1]);
      return Promise.resolve({ data: exercisesMap[trainingId] || [] });
    }
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
}

function renderMyProtocolDetail() {
  return renderWithRoute(<MyProtocolDetail />, {
    route: '/my/protocols/1',
    path: '/my/protocols/:id',
  });
}

describe('MyProtocolDetail', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderMyProtocolDetail();

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('fetches protocol and trainings on mount', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/my/protocols/1');
      expect(api.get).toHaveBeenCalledWith('/my/protocols/1/trainings');
    });
  });

  it('fetches exercises for each training', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/my/trainings/10/exercises');
      expect(api.get).toHaveBeenCalledWith('/my/trainings/11/exercises');
    });
  });

  it('renders protocol info after loading', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Minha Rotina de Treino')).toBeInTheDocument();
      expect(screen.getByText('Trainer Silva')).toBeInTheDocument();
    });
  });

  it('renders expiration date without showing Invalid Date', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('31/03/2024')).toBeInTheDocument();
      expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
    });
  });

  it('renders translated status badge for the protocol', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Ativo')).toBeInTheDocument();
    });
  });

  it('does not show raw status string in the badge', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => screen.getByText('Ativo'));

    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument();
  });

  it('renders list of trainings', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });
  });

  it('renders weekDay badge for trainings that have weekDay', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Segunda-feira')).toBeInTheDocument();
    });
  });

  it('renders training notes when present', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Fazer alongamento antes')).toBeInTheDocument();
    });
  });

  it('shows empty state for trainings when there are none', async () => {
    setupApiMocks({ trainings: [] });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Nenhum treino ainda')).toBeInTheDocument();
    });
  });

  it('renders exercises with name and meta info', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Supino Reto')).toBeInTheDocument();
      expect(screen.getByText('Rosca Direta')).toBeInTheDocument();
    });
  });

  it('renders exercise meta with type, sets, reps and load', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText(/Força · 4x8–12 · 60 kg/)).toBeInTheDocument();
      expect(screen.getByText(/Força · 3x10/)).toBeInTheDocument();
    });
  });

  it('renders exercise notes when present', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Manter cotovelos alinhados')).toBeInTheDocument();
    });
  });

  it('renders video button when exercise has a YouTube videoUrl', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      const videoBtn = screen.getByRole('button', { name: /ver vídeo/i });
      expect(videoBtn).toBeInTheDocument();
    });
  });

  it('opens video modal when clicking Ver vídeo for a YouTube URL', async () => {
    setupApiMocks();
    const user = userEvent.setup();

    renderMyProtocolDetail();

    const videoBtn = await screen.findByRole('button', { name: /ver vídeo/i });
    await user.click(videoBtn);

    expect(screen.getByTitle('Vídeo do exercício')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fechar vídeo/i })).toBeInTheDocument();
  });

  it('closes video modal when clicking close button', async () => {
    setupApiMocks();
    const user = userEvent.setup();

    renderMyProtocolDetail();

    const videoBtn = await screen.findByRole('button', { name: /ver vídeo/i });
    await user.click(videoBtn);

    const closeBtn = screen.getByRole('button', { name: /fechar vídeo/i });
    await user.click(closeBtn);

    expect(screen.queryByTitle('Vídeo do exercício')).not.toBeInTheDocument();
  });

  it('renders external link for non-YouTube videoUrl', async () => {
    setupApiMocks({
      exercisesMap: {
        10: [{ ...mockExercisesA[0], videoUrl: 'https://vimeo.com/123456' }],
        20: mockExercisesB,
      },
    });

    renderMyProtocolDetail();

    await waitFor(() => {
      const videoLink = screen.getByRole('link', { name: /ver vídeo/i });
      expect(videoLink).toHaveAttribute('href', 'https://vimeo.com/123456');
      expect(videoLink).toHaveAttribute('target', '_blank');
    });
  });

  it('does not render video button when exercise has no videoUrl', async () => {
    setupApiMocks({
      trainings: [mockTrainings[0]],
      exercisesMap: {
        10: [{ ...mockExercisesA[1], videoUrl: null }],
      },
    });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Rosca Direta')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /ver vídeo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ver vídeo/i })).not.toBeInTheDocument();
  });

  it('shows a GIF control for an exercise with only gifUrl and renders the GIF in the sheet', async () => {
    const GIF_URL = 'https://media.example.com/rosca.gif';
    setupApiMocks({
      trainings: [mockTrainings[0]],
      exercisesMap: { 10: [{ ...mockExercisesA[1], videoUrl: null, gifUrl: GIF_URL }] },
    });
    const user = userEvent.setup();

    renderMyProtocolDetail();

    await user.click(await screen.findByRole('button', { name: /ver gif/i }));

    expect(screen.getByRole('img', { name: /gif do exercício/i })).toHaveAttribute('src', GIF_URL);
    expect(document.querySelector('iframe')).not.toBeInTheDocument();
  });

  it('closes the GIF sheet', async () => {
    setupApiMocks({
      trainings: [mockTrainings[0]],
      exercisesMap: { 10: [{ ...mockExercisesA[1], videoUrl: null, gifUrl: 'https://media.example.com/rosca.gif' }] },
    });
    const user = userEvent.setup();

    renderMyProtocolDetail();

    await user.click(await screen.findByRole('button', { name: /ver gif/i }));
    await user.click(screen.getByRole('button', { name: /fechar gif/i }));

    expect(screen.queryByRole('img', { name: /gif do exercício/i })).not.toBeInTheDocument();
  });

  it('prefers the YouTube video over the GIF when the exercise has both', async () => {
    setupApiMocks({
      trainings: [mockTrainings[0]],
      exercisesMap: { 10: [{ ...mockExercisesA[0], gifUrl: 'https://media.example.com/supino.gif' }] },
    });
    const user = userEvent.setup();

    renderMyProtocolDetail();

    expect(await screen.findByRole('button', { name: /ver vídeo/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ver gif/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ver vídeo/i }));

    expect(screen.getByTitle('Vídeo do exercício')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /gif do exercício/i })).not.toBeInTheDocument();
  });

  it('shows empty exercises message for training with no exercises', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Nenhum exercício adicionado.')).toBeInTheDocument();
    });
  });

  it('shows "not found" state when protocol cannot be loaded', async () => {
    api.get.mockRejectedValue(new Error('Not found'));

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Rotina não encontrada')).toBeInTheDocument();
    });
  });

  it('renders a back button to return to protocols list', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => screen.getByText('Minha Rotina de Treino'));

    expect(screen.getByRole('button', { name: /voltar para minhas rotinas/i })).toBeInTheDocument();
  });

  it('shows total trainings count', async () => {
    setupApiMocks();

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('renders assigned training before unassigned training regardless of API order', async () => {
    // API returns unassigned first, then assigned — UI must reorder.
    const trainingsUnassignedFirst = [
      { id: 11, name: 'Treino B', order: 1, notes: null },
      { id: 10, name: 'Treino A', order: 2, weekDay: 'MONDAY', notes: null },
    ];
    setupApiMocks({
      trainings: trainingsUnassignedFirst,
      exercisesMap: { 10: [], 11: [] },
    });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });

    const trainingNames = screen
      .getAllByRole('heading', { level: 3 })
      .map((el) => el.textContent);
    const indexA = trainingNames.indexOf('Treino A');
    const indexB = trainingNames.indexOf('Treino B');
    expect(indexA).toBeLessThan(indexB);
  });

  it('sorts multiple assigned trainings by canonical weekday order', async () => {
    const trainingsOutOfOrder = [
      { id: 1, name: 'Treino Sexta', order: 1, weekDay: 'FRIDAY', notes: null },
      { id: 2, name: 'Treino Segunda', order: 2, weekDay: 'MONDAY', notes: null },
      { id: 3, name: 'Treino Quarta', order: 3, weekDay: 'WEDNESDAY', notes: null },
    ];
    setupApiMocks({
      trainings: trainingsOutOfOrder,
      exercisesMap: { 1: [], 2: [], 3: [] },
    });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Treino Segunda')).toBeInTheDocument();
    });

    const trainingNames = screen
      .getAllByRole('heading', { level: 3 })
      .map((el) => el.textContent);
    const indexSeg = trainingNames.indexOf('Treino Segunda');
    const indexQua = trainingNames.indexOf('Treino Quarta');
    const indexSex = trainingNames.indexOf('Treino Sexta');
    expect(indexSeg).toBeLessThan(indexQua);
    expect(indexQua).toBeLessThan(indexSex);
  });
});
