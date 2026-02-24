import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import TrainingTemplates from './TrainingTemplates';
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
  { id: 1, name: 'Treino A', description: 'Descrição do treino A', isPublic: false, category: 'strength', bodySegment: 'upper' },
  { id: 2, name: 'Treino B', description: 'Descrição do treino B', isPublic: true, category: 'cardio', bodySegment: 'lower' },
];

describe('TrainingTemplates', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockResolvedValue({ data: mockTemplates });
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('renders the page title', () => {
    renderWithRouter(<TrainingTemplates />);

    expect(screen.getByText('Modelos de Treino')).toBeInTheDocument();
  });

  it('fetches and displays templates on mount', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });
  });

  it('shows "Público" badge for public templates', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Público')).toBeInTheDocument();
    });
  });

  it('shows empty state and info banner when there are no templates', async () => {
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum modelo de treino ainda')).toBeInTheDocument();
      expect(screen.getByText(/O que é um modelo de treino/i)).toBeInTheDocument();
    });
  });

  it('does not show info banner when templates exist', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    expect(screen.queryByText(/O que é um modelo de treino/i)).not.toBeInTheDocument();
  });

  it('shows loading and avoids empty-state flash before GET resolves', async () => {
    let resolveTemplates;
    const templatesPromise = new Promise((resolve) => {
      resolveTemplates = resolve;
    });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return templatesPromise;
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<TrainingTemplates />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum modelo de treino ainda')).not.toBeInTheDocument();

    resolveTemplates({ data: [] });

    await waitFor(() => {
      expect(screen.getByText('Nenhum modelo de treino ainda')).toBeInTheDocument();
    });
  });

  it('shows "+ Novo Modelo de Treino" button when form is hidden', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    expect(screen.getByRole('button', { name: /novo modelo de treino/i })).toBeInTheDocument();
  });

  it('shows the create form when "+ Novo Modelo de Treino" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    await user.click(screen.getByRole('button', { name: /novo modelo de treino/i }));

    expect(screen.getByText('Criar Novo Modelo de Treino')).toBeInTheDocument();
  });

  it('hides the "+" button when the form is visible', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo modelo de treino/i }));

    expect(screen.queryByRole('button', { name: /novo modelo de treino/i })).not.toBeInTheDocument();
  });

  it('calls POST to create a new template on form submission', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 3, name: 'Novo Treino', isPublic: false } });
    api.get.mockResolvedValue({ data: [...mockTemplates, { id: 3, name: 'Novo Treino', isPublic: false }] });

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo modelo de treino/i }));

    const nameInput = screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'Novo Treino');
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'strength');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/training-templates', expect.objectContaining({
        name: 'Novo Treino',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Modelo de treino criado com sucesso!', 'success');
    });
  });

  it('hides form and clears data on Cancel click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo modelo de treino/i }));

    expect(screen.getByText('Criar Novo Modelo de Treino')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByText('Criar Novo Modelo de Treino')).not.toBeInTheDocument();
  });

  it('populates form with existing data when Edit is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    await user.click(editButtons[0]);

    expect(screen.getByText('Editar Modelo de Treino')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Treino A')).toBeInTheDocument();
  });

  it('calls PATCH on save when editing an existing template', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockTemplates[0] });

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    await user.click(editButtons[0]);
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/training-templates/1', expect.any(Object));
      expect(mockShowToast).toHaveBeenCalledWith('Modelo de treino atualizado com sucesso!', 'success');
    });
  });

  it('shows custom confirm dialog and calls DELETE on confirmation', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i });
    await user.click(deleteButtons[0]);
    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/training-templates/1');
      expect(mockShowToast).toHaveBeenCalledWith('Modelo de treino excluído com sucesso!', 'success');
    });
  });

  it('does not delete when custom dialog confirmation is cancelled', async () => {
    const user = userEvent.setup();

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i });
    await user.click(deleteButtons[0]);
    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });
});
