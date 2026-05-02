import { render, screen, waitFor, within } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseTemplateForm from './ExerciseTemplateForm';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();
const mockOnCancel = vi.fn();
const mockOnSuccess = vi.fn();
const mockOnNameChange = vi.fn();

const VALID_YOUTUBE_URL = 'https://www.youtube.com/watch?v=abc123XYZ';
const VALID_VIDEO_ID = 'abc123XYZ';
const INVALID_URL = 'https://vimeo.com/123456';

const renderForm = (props = {}) =>
  render(
    <ExerciseTemplateForm
      onCancel={mockOnCancel}
      onSuccess={mockOnSuccess}
      onNameChange={mockOnNameChange}
      {...props}
    />
  );

const fillRepsValues = async (user, { sets = '3', min = '8', max = '12' } = {}) => {
  await user.type(screen.getByLabelText(/séries/i), sets);
  await user.type(screen.getByLabelText(/repetições mínimas/i), min);
  await user.type(screen.getByLabelText(/repetições máximas/i), max);
};

const selectType = async (user, label) => {
  await user.click(screen.getByRole('radio', { name: new RegExp(label, 'i') }));
};

describe('ExerciseTemplateForm', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockOnCancel.mockReset();
    mockOnSuccess.mockReset();
    mockOnNameChange.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.post.mockReset();
    api.patch.mockReset();
    api.get.mockReset();
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  it('renders core form fields', () => {
    renderForm();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/url do vídeo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/intervalo de descanso/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument();
  });

  it('renders type segmented toggle with 4 options', () => {
    renderForm();
    expect(screen.getByRole('radio', { name: /força/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /cardio/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /mobilidade/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /alongamento/i })).toBeInTheDocument();
  });

  it('renders rest interval quick-chips', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /60s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /90s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /120s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /180s/i })).toBeInTheDocument();
  });

  it('renders visibility card with public switch', () => {
    renderForm();
    expect(screen.getByLabelText(/tornar este modelo público/i)).toBeInTheDocument();
  });

  // ── Video hero — empty state ───────────────────────────────────────────

  it('renders empty stage hint text when no URL is entered', () => {
    renderForm();
    expect(
      screen.getByText(/cole o link do youtube abaixo/i)
    ).toBeInTheDocument();
  });

  it('does not render a thumbnail image in empty state', () => {
    renderForm();
    expect(screen.queryByRole('img', { name: /miniatura/i })).not.toBeInTheDocument();
  });

  it('does not show "Remover vídeo" button in empty state', () => {
    renderForm();
    expect(
      screen.queryByRole('button', { name: /remover vídeo/i })
    ).not.toBeInTheDocument();
  });

  // ── Video hero — filled state ──────────────────────────────────────────

  it('renders thumbnail img with correct src when a valid YouTube URL is entered', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);

    const thumb = screen.getByRole('img', { name: /miniatura do vídeo/i });
    expect(thumb).toBeInTheDocument();
    expect(thumb).toHaveAttribute(
      'src',
      `https://img.youtube.com/vi/${VALID_VIDEO_ID}/hqdefault.jpg`
    );
  });

  it('renders play button in filled state', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);

    expect(
      screen.getByRole('button', { name: /reproduzir prévia/i })
    ).toBeInTheDocument();
  });

  it('shows "Remover vídeo" button only in filled state', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(
      screen.queryByRole('button', { name: /remover vídeo/i })
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);

    expect(
      screen.getByRole('button', { name: /remover vídeo/i })
    ).toBeInTheDocument();
  });

  // ── Video hero — invalid URL state ────────────────────────────────────

  it('shows inline error for an invalid (non-YouTube) URL', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), INVALID_URL);

    expect(screen.getByRole('alert')).toHaveTextContent(/link de youtube inválido/i);
  });

  it('keeps the stage in empty state when URL is invalid', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), INVALID_URL);

    expect(screen.queryByRole('img', { name: /miniatura do vídeo/i })).not.toBeInTheDocument();
    expect(screen.getByText(/cole o link do youtube abaixo/i)).toBeInTheDocument();
  });

  it('does not show invalid-URL error when the input is empty', () => {
    renderForm();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // ── Video hero — thumbnail fallback ──────────────────────────────────

  it('shows fallback hint when the thumbnail image fails to load', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);

    const thumb = screen.getByRole('img', { name: /miniatura do vídeo/i });

    // Simulate a broken image (private/deleted video)
    thumb.dispatchEvent(new Event('error', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/vídeo indisponível/i)).toBeInTheDocument();
    });
  });

  // ── Video hero — inline playback ──────────────────────────────────────

  it('play button swaps thumbnail for inline iframe', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);
    await user.click(screen.getByRole('button', { name: /reproduzir prévia/i }));

    const iframes = document.querySelectorAll('iframe');
    const youtubeIframe = Array.from(iframes).find((el) =>
      el.src.includes(`youtube.com/embed/${VALID_VIDEO_ID}`)
    );
    expect(youtubeIframe).toBeTruthy();
    expect(screen.queryByRole('img', { name: /miniatura do vídeo/i })).not.toBeInTheDocument();
  });

  it('inline iframe src includes autoplay=1', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);
    await user.click(screen.getByRole('button', { name: /reproduzir prévia/i }));

    const iframes = document.querySelectorAll('iframe');
    const youtubeIframe = Array.from(iframes).find((el) =>
      el.src.includes(`youtube.com/embed/${VALID_VIDEO_ID}`)
    );
    expect(youtubeIframe.src).toContain('autoplay=1');
  });

  it('changing the URL while playing resets to thumbnail state', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);
    await user.click(screen.getByRole('button', { name: /reproduzir prévia/i }));

    // Confirm we're in playing state
    expect(screen.queryByRole('img', { name: /miniatura do vídeo/i })).not.toBeInTheDocument();

    // Clear and type a new valid URL
    await user.clear(screen.getByLabelText(/url do vídeo/i));
    await user.type(screen.getByLabelText(/url do vídeo/i), 'https://www.youtube.com/watch?v=newVideo99');

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /miniatura do vídeo/i })).toBeInTheDocument();
    });
    expect(document.querySelectorAll('iframe').length).toBe(0);
  });

  it('does not show play button when no valid YouTube URL is present', () => {
    renderForm();
    expect(
      screen.queryByRole('button', { name: /reproduzir prévia/i })
    ).not.toBeInTheDocument();
  });

  it('does not show expand/maximize button in any state', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);

    expect(
      screen.queryByRole('button', { name: /expandir vídeo em tela cheia/i })
    ).not.toBeInTheDocument();
  });

  // ── "Remover vídeo" confirm dialog ────────────────────────────────────

  it('opens a confirm dialog when "Remover vídeo" is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);
    await user.click(screen.getByRole('button', { name: /remover vídeo/i }));

    expect(
      screen.getByRole('dialog', { name: /remover vídeo\?/i })
    ).toBeInTheDocument();
  });

  it('clears videoUrl after confirming removal', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);
    await user.click(screen.getByRole('button', { name: /remover vídeo/i }));

    const dialog = screen.getByRole('dialog', { name: /remover vídeo\?/i });
    await user.click(within(dialog).getByRole('button', { name: /confirmar/i }));

    expect(screen.getByLabelText(/url do vídeo/i)).toHaveValue('');
    expect(screen.queryByRole('button', { name: /remover vídeo/i })).not.toBeInTheDocument();
  });

  it('does not clear videoUrl when removal is cancelled', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);
    await user.click(screen.getByRole('button', { name: /remover vídeo/i }));

    const dialog = screen.getByRole('dialog', { name: /remover vídeo\?/i });
    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }));

    expect(screen.getByLabelText(/url do vídeo/i)).toHaveValue(VALID_YOUTUBE_URL);
  });

  // ── Type segmented toggle ──────────────────────────────────────────────

  it('selects exercise type when a type chip is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    const cardioBtn = screen.getByRole('radio', { name: /cardio/i });
    await user.click(cardioBtn);
    expect(cardioBtn).toHaveAttribute('aria-checked', 'true');
  });

  it('changes selection when a different type is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('radio', { name: /força/i }));
    await user.click(screen.getByRole('radio', { name: /mobilidade/i }));

    expect(screen.getByRole('radio', { name: /força/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /mobilidade/i })).toHaveAttribute('aria-checked', 'true');
  });

  // ── Rest interval chips ────────────────────────────────────────────────

  it('fills the rest interval input when a chip is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /90s/i }));

    expect(screen.getByLabelText(/intervalo de descanso/i)).toHaveValue(90);
  });

  it('marks the active chip as pressed when it matches the input value', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /120s/i }));

    expect(screen.getByRole('button', { name: /120s/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /60s/i })).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Load toggle ────────────────────────────────────────────────────────

  it('shows the suggested load field by default (load ON for new templates)', () => {
    renderForm();
    expect(screen.getByLabelText(/carga em kg/i)).toBeInTheDocument();
  });

  it('hides the suggested load field when the load switch is turned OFF', async () => {
    const user = userEvent.setup();
    renderForm();

    const loadSwitch = screen.getByRole('switch', { name: /exercício com carga/i });
    await user.click(loadSwitch);

    expect(screen.queryByLabelText(/carga em kg/i)).not.toBeInTheDocument();
  });

  it('shows the suggested load field again when the switch is toggled ON after OFF', async () => {
    const user = userEvent.setup();
    renderForm();

    const loadSwitch = screen.getByRole('switch', { name: /exercício com carga/i });
    await user.click(loadSwitch); // OFF
    await user.click(loadSwitch); // ON

    expect(screen.getByLabelText(/carga em kg/i)).toBeInTheDocument();
  });

  // ── Notes character counter ────────────────────────────────────────────

  it('shows character counter starting at 0/240', () => {
    renderForm();
    expect(screen.getByText('0/240')).toBeInTheDocument();
  });

  it('updates character counter as user types in notes', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/observações/i), 'Olá');
    expect(screen.getByText('3/240')).toBeInTheDocument();
  });

  // ── Visibility public confirm dialog ──────────────────────────────────

  it('shows confirm dialog on first activation of public switch', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText(/tornar este modelo público/i));

    const dialog = screen.getByRole('dialog', { name: /tornar público\?/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/outros treinadores podem usar/i)).toBeInTheDocument();
  });

  it('does not activate public when cancel is clicked in the confirm dialog', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText(/tornar este modelo público/i));

    const dialog = screen.getByRole('dialog', { name: /tornar público\?/i });
    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }));

    expect(screen.getByLabelText(/tornar este modelo público/i)).not.toBeChecked();
  });

  it('activates public when confirm is clicked in the dialog', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText(/tornar este modelo público/i));

    const dialog = screen.getByRole('dialog', { name: /tornar público\?/i });
    await user.click(within(dialog).getByRole('button', { name: /confirmar/i }));

    expect(screen.getByLabelText(/tornar este modelo público/i)).toBeChecked();
  });

  it('does not show confirm dialog on subsequent toggles in the same session', async () => {
    const user = userEvent.setup();
    renderForm();

    // First activation: confirm
    await user.click(screen.getByLabelText(/tornar este modelo público/i));
    const dialog = screen.getByRole('dialog', { name: /tornar público\?/i });
    await user.click(within(dialog).getByRole('button', { name: /confirmar/i }));

    // Turn off — no dialog
    await user.click(screen.getByLabelText(/tornar este modelo público/i));
    expect(screen.queryByRole('dialog', { name: /tornar público\?/i })).not.toBeInTheDocument();

    // Turn on again — no dialog
    await user.click(screen.getByLabelText(/tornar este modelo público/i));
    expect(screen.queryByRole('dialog', { name: /tornar público\?/i })).not.toBeInTheDocument();
  });

  // ── onNameChange callback ─────────────────────────────────────────────

  it('calls onNameChange when the name input changes', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino');
    expect(mockOnNameChange).toHaveBeenCalledWith(expect.stringContaining('S'));
  });

  // ── Cancel ────────────────────────────────────────────────────────────

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  // ── Submission — create ───────────────────────────────────────────────

  it('submits to the correct endpoint for creation', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 1, name: 'Supino Reto' } });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await selectType(user, 'Força');
    await fillRepsValues(user);
    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ name: 'Supino Reto', type: 'strength' })
      );
    });
  });

  it('shows success toast on creation', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 1, name: 'Supino Reto' } });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await selectType(user, 'Força');
    await fillRepsValues(user);
    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Exercício criado com sucesso!', 'success');
    });
  });

  it('calls onSuccess with created data', async () => {
    const user = userEvent.setup();
    const created = { id: 42, name: 'Supino Reto', type: 'strength' };
    api.post.mockResolvedValueOnce({ data: created });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await selectType(user, 'Força');
    await fillRepsValues(user);
    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(created);
    });
  });

  it('shows error toast on API failure', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({ userMessage: 'Erro ao criar' });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await selectType(user, 'Força');
    await fillRepsValues(user);
    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao criar', 'error');
    });
  });

  it('includes isPublic:true in payload after confirming visibility dialog', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: {} });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await selectType(user, 'Força');
    await fillRepsValues(user);

    // Activate public visibility — first time triggers confirm dialog
    await user.click(screen.getByLabelText(/tornar este modelo público/i));
    const visDialog = screen.getByRole('dialog', { name: /tornar público\?/i });
    await user.click(within(visDialog).getByRole('button', { name: /confirmar/i }));

    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ isPublic: true })
      );
    });
  });

  // ── Prescription mode ─────────────────────────────────────────────────

  describe('prescription mode', () => {
    const switchToDuration = async (user) => {
      await user.click(screen.getByRole('tab', { name: /tempo/i }));
    };

    it('shows repetitions fields by default', () => {
      renderForm();
      expect(screen.getByLabelText(/repetições mínimas/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^duração$/i)).not.toBeInTheDocument();
    });

    it('switches to duration and shows duration field', async () => {
      const user = userEvent.setup();
      renderForm();
      await switchToDuration(user);
      expect(screen.getByLabelText(/^duração$/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/repetições mínimas/i)).not.toBeInTheDocument();
    });

    it('shows inline error when submitting duration mode without a value', async () => {
      const user = userEvent.setup();
      renderForm();
      await switchToDuration(user);
      await user.type(screen.getByLabelText(/nome/i), 'Prancha');
      await selectType(user, 'Força');
      await user.click(screen.getByRole('button', { name: /criar exercício/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/defina o valor/i);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows inline error when submitting reps mode without repetitions', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
      await selectType(user, 'Força');
      await user.click(screen.getByRole('button', { name: /criar exercício/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/defina o valor/i);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('sends prescriptionMode:"reps" in payload by default', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({ data: {} });
      renderForm();
      await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
      await selectType(user, 'Força');
      await fillRepsValues(user);
      await user.click(screen.getByRole('button', { name: /criar exercício/i }));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/exercise-templates',
          expect.objectContaining({ prescriptionMode: 'reps' })
        );
      });
    });

    it('sends duration and prescriptionMode:"duration" when in duration mode', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({ data: {} });
      renderForm();
      await switchToDuration(user);
      await user.type(screen.getByLabelText(/nome/i), 'Prancha');
      await selectType(user, 'Força');
      await user.type(screen.getByLabelText(/^duração$/i), '45');
      await user.click(screen.getByRole('button', { name: /criar exercício/i }));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/exercise-templates',
          expect.objectContaining({ prescriptionMode: 'duration', duration: 45 })
        );
      });
    });
  });

  // ── Video library picker ──────────────────────────────────────────────

  describe('video library picker', () => {
    const sampleVideo = {
      id: 'video-1',
      title: 'Agachamento livre',
      url: 'https://video.example.com/squat',
      thumbnailUrl: null,
      duration: 90,
      category: 'strength',
      categoryLabel: 'Força',
      bodySegment: 'lower',
      bodySegmentLabel: 'Inferior',
      tags: ['forca'],
      createdById: 'admin-1',
      createdAt: '2025-04-01T12:00:00.000Z',
    };

    it('opens the picker, selects a video and populates videoUrl', async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({
        data: { items: [sampleVideo], total: 1, page: 1, pageSize: 10 },
      });
      renderForm();

      await user.click(screen.getByRole('button', { name: /escolher da biblioteca/i }));
      await waitFor(() => screen.getByText('Agachamento livre'));
      await user.click(screen.getByRole('button', { name: /selecionar vídeo agachamento livre/i }));

      expect(screen.getByLabelText(/url do vídeo/i)).toHaveValue(
        'https://video.example.com/squat'
      );
      expect(
        screen.queryByRole('dialog', { name: /selecionar vídeo da biblioteca/i })
      ).not.toBeInTheDocument();
    });
  });

  // ── Edit mode ─────────────────────────────────────────────────────────

  describe('edit mode', () => {
    const exerciseTemplate = {
      id: 10,
      name: 'Supino Reto',
      type: 'strength',
      videoUrl: '',
      isPublic: false,
      prescriptionMode: 'reps',
      sets: 4,
      repetitions: { min: 8, max: 10 },
      duration: '',
      restInterval: 60,
      hasLoad: true,
      suggestedLoad: 60,
      notes: 'Executar com cuidado',
    };

    it('pre-populates form fields from exerciseTemplate', () => {
      renderForm({ exerciseTemplate });
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Supino Reto');
      expect(screen.getByRole('radio', { name: /força/i })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByLabelText(/séries/i)).toHaveValue(4);
      expect(screen.getByLabelText(/repetições mínimas/i)).toHaveValue(8);
      expect(screen.getByLabelText(/repetições máximas/i)).toHaveValue(10);
      expect(screen.getByLabelText(/intervalo de descanso/i)).toHaveValue(60);
      expect(screen.getByLabelText(/carga em kg/i)).toHaveValue(60);
      expect(screen.getByLabelText(/observações/i)).toHaveValue('Executar com cuidado');
    });

    it('shows "Salvar" button instead of "Criar exercício"', () => {
      renderForm({ exerciseTemplate });
      expect(screen.getByRole('button', { name: /^salvar$/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /criar exercício/i })
      ).not.toBeInTheDocument();
    });

    it('marks the rest chip as active when restInterval matches', () => {
      renderForm({ exerciseTemplate });
      expect(screen.getByRole('button', { name: /60s/i })).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls PATCH when submitting in edit mode', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValueOnce({
        data: { ...exerciseTemplate, name: 'Supino Inclinado' },
      });
      renderForm({ exerciseTemplate });

      await user.clear(screen.getByLabelText(/nome/i));
      await user.type(screen.getByLabelText(/nome/i), 'Supino Inclinado');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          '/trainer/exercise-templates/10',
          expect.objectContaining({ name: 'Supino Inclinado' })
        );
      });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows update success toast on edit', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValueOnce({ data: exerciseTemplate });
      renderForm({ exerciseTemplate });

      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Exercício atualizado com sucesso!', 'success');
      });
    });

    it('calls onSuccess with updated data on successful edit', async () => {
      const user = userEvent.setup();
      const updated = { ...exerciseTemplate, name: 'Supino Inclinado' };
      api.patch.mockResolvedValueOnce({ data: updated });
      renderForm({ exerciseTemplate });

      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(updated);
      });
    });

    it('renders duration field for duration-mode template', () => {
      const durationTemplate = {
        ...exerciseTemplate,
        prescriptionMode: 'duration',
        repetitions: null,
        duration: 45,
      };
      renderForm({ exerciseTemplate: durationTemplate });
      expect(screen.getByLabelText(/^duração$/i)).toHaveValue(45);
      expect(screen.queryByLabelText(/repetições mínimas/i)).not.toBeInTheDocument();
    });

    it('calls onNameChange with the initial name on mount', () => {
      renderForm({ exerciseTemplate });
      expect(mockOnNameChange).toHaveBeenCalledWith('Supino Reto');
    });

    it('does not show confirm dialog when editing a template already set to public', async () => {
      const user = userEvent.setup();
      const publicTemplate = { ...exerciseTemplate, isPublic: true };
      api.patch.mockResolvedValueOnce({ data: publicTemplate });
      renderForm({ exerciseTemplate: publicTemplate });

      const publicSwitch = screen.getByLabelText(/tornar este modelo público/i);
      await user.click(publicSwitch);
      expect(screen.queryByText(/tornar público\?/i)).not.toBeInTheDocument();
    });

    it('pre-fills video stage with thumbnail when template has a valid videoUrl', () => {
      const templateWithVideo = {
        ...exerciseTemplate,
        videoUrl: VALID_YOUTUBE_URL,
      };
      renderForm({ exerciseTemplate: templateWithVideo });

      const thumb = screen.getByRole('img', { name: /miniatura do vídeo/i });
      expect(thumb).toHaveAttribute(
        'src',
        `https://img.youtube.com/vi/${VALID_VIDEO_ID}/hqdefault.jpg`
      );
      expect(screen.getByRole('button', { name: /remover vídeo/i })).toBeInTheDocument();
    });
  });
});
