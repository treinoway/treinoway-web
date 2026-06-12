import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import ExerciseTemplates from './ExerciseTemplates';
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

// Library templates are identity-only: no prescription fields.
const mockTemplates = [
  { id: 1, name: 'Agachamento', type: 'strength', isPublic: false },
  { id: 2, name: 'Corrida', type: 'cardio', isPublic: true },
  { id: 3, name: 'Rosca Direta', type: 'strength', isPublic: false, videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ' },
];

describe('ExerciseTemplates', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockResolvedValue({ data: mockTemplates });
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('renders the page title', () => {
    renderWithRouter(<ExerciseTemplates />);

    expect(screen.getByText('Exercícios')).toBeInTheDocument();
  });

  it('fetches and displays templates on mount', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Agachamento')).toBeInTheDocument();
      expect(screen.getByText('Corrida')).toBeInTheDocument();
    });
  });

  it('shows "Público" badge for public templates', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Público')).toBeInTheDocument();
    });
  });

  it('shows empty state and info banner when there are no templates', async () => {
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum exercício ainda')).toBeInTheDocument();
      expect(screen.getByText(/O que é um exercício\?/i)).toBeInTheDocument();
    });
  });

  it('shows CTA button in empty state that opens the create form', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum exercício ainda')).toBeInTheDocument();
    });

    const ctaButton = screen.getByRole('button', { name: /criar primeiro exercício/i });
    expect(ctaButton).toBeInTheDocument();

    await user.click(ctaButton);

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
  });

  it('shows loading before GET resolves', async () => {
    let resolveTemplates;
    const templatesPromise = new Promise((resolve) => {
      resolveTemplates = resolve;
    });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/exercise-templates') return templatesPromise;
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<ExerciseTemplates />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    resolveTemplates({ data: [] });

    await waitFor(() => {
      expect(screen.getByText('Nenhum exercício ainda')).toBeInTheDocument();
    });
  });

  it('shows the create form when "+ Novo exercício" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    await user.click(screen.getByRole('button', { name: /novo exercício/i }));

    // New form shows name input and the "Sem nome ainda" placeholder h1
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByText('Sem nome ainda')).toBeInTheDocument();
  });

  it('calls POST to create a new template on form submission', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 3, name: 'Flexão', type: 'strength', isPublic: false } });
    api.get.mockResolvedValue({
      data: [...mockTemplates, { id: 3, name: 'Flexão', type: 'strength', isPublic: false }],
    });

    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));
    await user.click(screen.getByRole('button', { name: /novo exercício/i }));

    await user.type(screen.getByLabelText(/nome/i), 'Flexão');
    // Type is now a segmented radio toggle — click the radio button
    await user.click(screen.getByRole('radio', { name: /força/i }));
    // Library templates are identity-only — no prescription fields to fill.
    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ name: 'Flexão', type: 'strength' })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Exercício criado com sucesso!', 'success');
    });
  });

  it('does not render prescription meta on the library rows', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    // No sets×reps / load / rest strings rendered for library templates.
    expect(screen.queryByText(/4x8/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kg/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/descanso/i)).not.toBeInTheDocument();
  });

  it('populates form with existing data when Edit is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo agachamento/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Editar'));

    // Page header now shows the template name as h1
    expect(screen.getByDisplayValue('Agachamento')).toBeInTheDocument();
    // Type radio should be pre-selected
    expect(screen.getByRole('radio', { name: /força/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('calls PATCH on save when editing an existing template', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockTemplates[0] });

    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo agachamento/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Editar'));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/exercise-templates/1', expect.any(Object));
      expect(mockShowToast).toHaveBeenCalledWith('Exercício atualizado com sucesso!', 'success');
    });
  });

  it('shows custom confirm dialog and calls DELETE on confirmation', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});

    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo agachamento/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Excluir'));
    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/exercise-templates/1');
      expect(mockShowToast).toHaveBeenCalledWith('Exercício excluído com sucesso!', 'success');
    });
  });

  it('does not delete when custom dialog confirmation is cancelled', async () => {
    const user = userEvent.setup();

    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo agachamento/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Excluir'));
    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('renders the unified list (no view toggle buttons)', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    expect(screen.queryByRole('button', { name: /visualização em cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /visualização em lista/i })).not.toBeInTheDocument();
  });

  it('displays all templates as list rows', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Agachamento')).toBeInTheDocument();
      expect(screen.getByText('Corrida')).toBeInTheDocument();
      expect(screen.getByText('Rosca Direta')).toBeInTheDocument();
    });
  });

  it('shows Vídeo badge for template with a valid YouTube URL', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Rosca Direta'));

    expect(screen.getByText('Vídeo')).toBeInTheDocument();
  });

  it('does not show Vídeo badge for templates without a videoUrl', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    // Only Rosca Direta has a video — expect exactly one badge
    expect(screen.getAllByText('Vídeo').length).toBe(1);
  });

  it('hides header actions when form is open', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    await user.click(screen.getByRole('button', { name: /novo exercício/i }));

    expect(screen.queryByRole('button', { name: /visualização em cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /visualização em lista/i })).not.toBeInTheDocument();
  });

  it('shows play button (not expand) in create form when a valid YouTube URL is entered', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));
    await user.click(screen.getByRole('button', { name: /novo exercício/i }));

    await user.type(
      screen.getByLabelText(/url do vídeo/i),
      'https://www.youtube.com/watch?v=formPreviewId'
    );

    expect(
      screen.getByRole('button', { name: /reproduzir prévia/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /expandir vídeo em tela cheia/i })
    ).not.toBeInTheDocument();
  });

  it('clicking play in edit form swaps thumbnail for inline iframe', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Rosca Direta'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo rosca direta/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Editar'));

    await user.click(screen.getByRole('button', { name: /reproduzir prévia/i }));

    const iframes = document.querySelectorAll('iframe');
    const inlineIframe = Array.from(iframes).find((el) =>
      el.src.includes('youtube.com/embed/abc123XYZ')
    );
    expect(inlineIframe).toBeTruthy();
    expect(screen.queryByRole('img', { name: /miniatura do vídeo/i })).not.toBeInTheDocument();
  });
});
