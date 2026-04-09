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

const mockTemplates = [
  { id: 1, name: 'Agachamento', type: 'strength', sets: 4, repetitions: { min: 8, max: 10 }, hasLoad: true, suggestedLoad: 60, isPublic: false },
  { id: 2, name: 'Corrida', type: 'cardio', duration: 600, isPublic: true },
  { id: 3, name: 'Rosca Direta', type: 'strength', sets: 3, repetitions: { min: 12, max: 12 }, hasLoad: true, suggestedLoad: 10, isPublic: false, videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ' },
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

    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
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

    expect(screen.getByText('Criar novo exercício')).toBeInTheDocument();
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

    const nameInput = screen.getByLabelText(/nome/i);
    await user.type(nameInput, 'Flexão');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ name: 'Flexão', type: 'strength' })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Exercício criado com sucesso!', 'success');
    });
  });

  it('populates form with existing data when Edit is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo agachamento/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Editar'));

    expect(screen.getByText('Editar exercício')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Agachamento')).toBeInTheDocument();
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

  it('shows view toggle buttons', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    expect(screen.getByRole('button', { name: /visualização em cards/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /visualização em lista/i })).toBeInTheDocument();
  });

  it('switches to list view when list toggle is clicked and shows table', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    await user.click(screen.getByRole('button', { name: /visualização em lista/i }));

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Agachamento')).toBeInTheDocument();
    expect(screen.getByText('Corrida')).toBeInTheDocument();
  });

  it('switches back to card view when card toggle is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    await user.click(screen.getByRole('button', { name: /visualização em lista/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /visualização em cards/i }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows YouTube preview iframe in card view when template has a valid YouTube URL', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Rosca Direta'));

    const iframes = document.querySelectorAll('iframe');
    const youtubeIframe = Array.from(iframes).find((el) =>
      el.src.includes('youtube.com/embed/abc123XYZ')
    );
    expect(youtubeIframe).toBeTruthy();
  });

  it('does not show YouTube iframe for templates without videoUrl', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    const iframes = document.querySelectorAll('iframe');
    expect(iframes.length).toBe(1);
  });

  it('shows YouTube link column in list view for templates with valid YouTube URL', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    await user.click(screen.getByRole('button', { name: /visualização em lista/i }));

    const youtubeLinks = screen.getAllByText('YouTube');
    expect(youtubeLinks.length).toBeGreaterThan(0);
  });

  it('hides view toggle buttons when form is open', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    await user.click(screen.getByRole('button', { name: /novo exercício/i }));

    expect(screen.queryByRole('button', { name: /visualização em cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /visualização em lista/i })).not.toBeInTheDocument();
  });

  it('shows YouTube embed preview in create form when a valid YouTube URL is entered', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));
    await user.click(screen.getByRole('button', { name: /novo exercício/i }));

    const videoInput = screen.getByLabelText(/url do vídeo/i);
    await user.type(videoInput, 'https://www.youtube.com/watch?v=formPreviewId');

    const iframes = document.querySelectorAll('iframe');
    const formPreviewIframe = Array.from(iframes).find((el) =>
      el.src.includes('youtube.com/embed/formPreviewId')
    );
    expect(formPreviewIframe).toBeTruthy();
  });

  it('shows YouTube embed preview in edit form when template has videoUrl', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Rosca Direta'));

    await user.click(screen.getByRole('button', { name: /visualização em cards/i }));
    const menuTrigger = screen.getByRole('button', { name: /ações do modelo rosca direta/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Editar'));

    const iframes = document.querySelectorAll('iframe');
    const formPreviewIframe = Array.from(iframes).find((el) =>
      el.src.includes('youtube.com/embed/abc123XYZ')
    );
    expect(formPreviewIframe).toBeTruthy();
  });
});
