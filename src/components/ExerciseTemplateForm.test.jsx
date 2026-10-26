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
const GIF_URL = 'https://media.example.com/agachamento.gif';
const INVALID_URL = 'https://vimeo.com/123456';

const renderForm = (props = {}) =>
  render(
    <ExerciseTemplateForm
      onCancel={mockOnCancel}
      onSuccess={mockOnSuccess}
      onNameChange={mockOnNameChange}
      isAdmin
      {...props}
    />
  );

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

  it('renders identity-only form fields', () => {
    renderForm();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/url do vídeo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tornar este modelo público/i)).toBeInTheDocument();
  });

  it('does NOT render prescription fields (sets, reps, duration, rest, load, notes)', () => {
    renderForm();
    expect(screen.queryByLabelText(/séries/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/repetições mínimas/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/repetições máximas/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^duração$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/intervalo de descanso/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/carga em kg/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/observações/i)).not.toBeInTheDocument();
  });

  it('does NOT render the intensity field', () => {
    renderForm();
    expect(screen.queryByText(/intensidade/i)).not.toBeInTheDocument();
  });

  it('renders type segmented toggle with 4 options', () => {
    renderForm();
    expect(screen.getByRole('radio', { name: /força/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /cardio/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /mobilidade/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /alongamento/i })).toBeInTheDocument();
  });

  it('renders an info hint explaining prescription is set per training', () => {
    renderForm();
    expect(
      screen.getByText(/definidos ao adicionar este exercício a um treino/i)
    ).toBeInTheDocument();
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

  // ── "Remover vídeo" confirm dialog ────────────────────────────────────

  it('opens a confirm dialog when "Remover vídeo" is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);
    await user.click(screen.getByRole('button', { name: /remover vídeo/i }));

    expect(
      screen.getByRole('alertdialog', { name: /remover vídeo\?/i })
    ).toBeInTheDocument();
  });

  it('clears videoUrl after confirming removal', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);
    await user.click(screen.getByRole('button', { name: /remover vídeo/i }));

    const dialog = screen.getByRole('alertdialog', { name: /remover vídeo\?/i });
    await user.click(within(dialog).getByRole('button', { name: /confirmar/i }));

    expect(screen.getByLabelText(/url do vídeo/i)).toHaveValue('');
    expect(screen.queryByRole('button', { name: /remover vídeo/i })).not.toBeInTheDocument();
  });

  it('does not clear videoUrl when removal is cancelled', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);
    await user.click(screen.getByRole('button', { name: /remover vídeo/i }));

    const dialog = screen.getByRole('alertdialog', { name: /remover vídeo\?/i });
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

  // ── Visibility public confirm dialog ──────────────────────────────────

  it('shows confirm dialog on first activation of public switch', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText(/tornar este modelo público/i));

    const dialog = screen.getByRole('alertdialog', { name: /tornar público\?/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/outros treinadores podem usar/i)).toBeInTheDocument();
  });

  it('does not activate public when cancel is clicked in the confirm dialog', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText(/tornar este modelo público/i));

    const dialog = screen.getByRole('alertdialog', { name: /tornar público\?/i });
    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }));

    expect(screen.getByLabelText(/tornar este modelo público/i)).not.toBeChecked();
  });

  it('activates public when confirm is clicked in the dialog', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText(/tornar este modelo público/i));

    const dialog = screen.getByRole('alertdialog', { name: /tornar público\?/i });
    await user.click(within(dialog).getByRole('button', { name: /confirmar/i }));

    expect(screen.getByLabelText(/tornar este modelo público/i)).toBeChecked();
  });

  it('does not show confirm dialog on subsequent toggles in the same session', async () => {
    const user = userEvent.setup();
    renderForm();

    // First activation: confirm
    await user.click(screen.getByLabelText(/tornar este modelo público/i));
    const dialog = screen.getByRole('alertdialog', { name: /tornar público\?/i });
    await user.click(within(dialog).getByRole('button', { name: /confirmar/i }));

    // Turn off — no dialog
    await user.click(screen.getByLabelText(/tornar este modelo público/i));
    expect(screen.queryByRole('alertdialog', { name: /tornar público\?/i })).not.toBeInTheDocument();

    // Turn on again — no dialog
    await user.click(screen.getByLabelText(/tornar este modelo público/i));
    expect(screen.queryByRole('alertdialog', { name: /tornar público\?/i })).not.toBeInTheDocument();
  });

  // ── onNameChange callback ─────────────────────────────────────────────

  it('calls onNameChange when the name input changes', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino');
    expect(mockOnNameChange).toHaveBeenCalledWith(expect.stringContaining('S'));
  });

  // ── Validation / busy / dirty ────────────────────────────────────────

  it('shows an inline error and does not call the API when the name is empty', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome do exercício.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('clears the name error as soon as the user types', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));
    await user.type(screen.getByLabelText(/nome/i), 'S');

    expect(screen.queryByText('Informe o nome do exercício.')).not.toBeInTheDocument();
  });

  it('shows the busy label and disables actions while saving', async () => {
    const user = userEvent.setup();
    api.post.mockReturnValue(new Promise(() => {}));
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    expect(await screen.findByRole('button', { name: 'Salvando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
  });

  it('reports dirty state through onDirtyChange', async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    renderForm({ onDirtyChange });

    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    await user.type(screen.getByLabelText(/nome/i), 'S');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await user.clear(screen.getByLabelText(/nome/i));
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('renders each section as a section card in the page variant', () => {
    renderForm({ variant: 'page' });
    expect(screen.getByRole('region', { name: 'Identificação' })).toHaveClass('section-card');
  });

  // ── Cancel ────────────────────────────────────────────────────────────

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  // ── Submission — create ───────────────────────────────────────────────

  it('submits only identity fields to the create endpoint', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 1, name: 'Supino Reto' } });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await selectType(user, 'Força');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        { name: 'Supino Reto', type: 'strength', isPublic: false }
      );
    });
  });

  it('does NOT send any prescription field in the create payload', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 1 } });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await selectType(user, 'Força');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const payload = api.post.mock.calls[0][1];
    [
      'sets', 'repetitions', 'duration', 'prescriptionMode', 'hasLoad',
      'suggestedLoad', 'restInterval', 'notes', 'intensity',
    ].forEach((field) => {
      expect(payload).not.toHaveProperty(field);
    });
  });

  it('includes videoUrl in the payload when provided', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 1 } });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await selectType(user, 'Força');
    await user.type(screen.getByLabelText(/url do vídeo/i), VALID_YOUTUBE_URL);
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ videoUrl: VALID_YOUTUBE_URL })
      );
    });
  });

  it('renders a GIF link input', () => {
    renderForm();
    expect(screen.getByLabelText(/link do gif/i)).toBeInTheDocument();
  });

  it('previews a typed GIF URL as an image in the media slot', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/link do gif/i), GIF_URL);

    expect(screen.getByRole('img', { name: /prévia do gif/i })).toHaveAttribute('src', GIF_URL);
  });

  it('includes gifUrl in the create payload when provided', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 1 } });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
    await selectType(user, 'Força');
    await user.type(screen.getByLabelText(/link do gif/i), GIF_URL);
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ gifUrl: GIF_URL })
      );
    });
  });

  it('pre-fills the GIF input and sends gifUrl: null after clearing it on edit', async () => {
    const user = userEvent.setup();
    const withGif = { id: 10, name: 'Agachamento', type: 'strength', videoUrl: '', gifUrl: GIF_URL, isPublic: false };
    api.patch.mockResolvedValueOnce({ data: { ...withGif, gifUrl: null } });
    renderForm({ exerciseTemplate: withGif });

    expect(screen.getByLabelText(/link do gif/i)).toHaveValue(GIF_URL);
    await user.clear(screen.getByLabelText(/link do gif/i));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/trainer/exercise-templates/10',
        expect.objectContaining({ gifUrl: null })
      );
    });
  });

  it('shows success toast on creation', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 1, name: 'Supino Reto' } });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await selectType(user, 'Força');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

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
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

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
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

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

    // Activate public visibility — first time triggers confirm dialog
    await user.click(screen.getByLabelText(/tornar este modelo público/i));
    const visDialog = screen.getByRole('alertdialog', { name: /tornar público\?/i });
    await user.click(within(visDialog).getByRole('button', { name: /confirmar/i }));

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ isPublic: true })
      );
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
    };

    it('pre-populates identity fields from exerciseTemplate', () => {
      renderForm({ exerciseTemplate });
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Supino Reto');
      expect(screen.getByRole('radio', { name: /força/i })).toHaveAttribute('aria-checked', 'true');
    });

    it('uses the same "Salvar" action as create mode', () => {
      renderForm({ exerciseTemplate });
      expect(screen.getByRole('button', { name: /^salvar$/i })).toBeInTheDocument();
    });

    it('calls PATCH with only identity fields when submitting in edit mode', async () => {
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
          { name: 'Supino Inclinado', type: 'strength', isPublic: false }
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

  describe('non-admin trainer', () => {
    const ownedTemplate = { id: 10, name: 'Supino', type: 'strength', videoUrl: '', isPublic: true };

    it('does not render the visibility section nor the library picker entry', () => {
      renderForm({ isAdmin: false });
      expect(screen.queryByRole('switch', { name: /tornar este modelo público/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /visibilidade/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /escolher da biblioteca/i })).not.toBeInTheDocument();
      expect(screen.getByLabelText(/url do vídeo/i)).toBeInTheDocument();
    });

    it('omits isPublic from the create payload', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({ data: { id: 1 } });
      renderForm({ isAdmin: false });

      await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/trainer/exercise-templates', { name: 'Supino Reto', type: 'strength' });
      });
    });

    it('omits isPublic from the edit payload so an existing value is never flipped', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValueOnce({ data: ownedTemplate });
      renderForm({ isAdmin: false, exerciseTemplate: ownedTemplate });

      await user.type(screen.getByLabelText(/nome/i), ' 2');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/trainer/exercise-templates/10', { name: 'Supino 2', type: 'strength' });
      });
    });
  });

  describe('admin', () => {
    it('renders the visibility switch and the library picker entry', () => {
      renderForm({ isAdmin: true });
      expect(screen.getByRole('switch', { name: /tornar este modelo público/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /escolher da biblioteca/i })).toBeInTheDocument();
    });
  });
});
