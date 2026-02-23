import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import TrainingProtocols from './TrainingProtocols';
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

const mockProtocols = [
  {
    id: 1,
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-03-31T00:00:00.000Z',
    status: 'ACTIVE',
    assignee: { email: 'aluno@example.com' },
  },
];

const mockTemplates = [
  { id: 1, name: 'Modelo Base', description: 'Desc', availableWeekDays: ['monday', 'wednesday'], defaultDurationWeeks: 12, genderOrdination: 'female', trainingLevel: 'beginner' },
];

const mockTrainingTemplates = [
  { id: 10, name: 'Treino A', category: 'strength', bodySegment: 'upper' },
  { id: 11, name: 'Treino B', category: 'cardio', bodySegment: 'lower' },
];

describe('TrainingProtocols', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.resolve({ data: mockProtocols });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: mockTemplates });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
      return Promise.resolve({ data: [] });
    });

    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('renders the page title', () => {
    renderWithRouter(<TrainingProtocols />);

    expect(screen.getByText('Rotinas de Treino')).toBeInTheDocument();
  });

  it('renders tab buttons for Rotinas and Modelos', () => {
    renderWithRouter(<TrainingProtocols />);

    expect(screen.getByRole('button', { name: /^rotinas$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^modelos$/i })).toBeInTheDocument();
  });

  it('shows Rotinas tab content by default', async () => {
    renderWithRouter(<TrainingProtocols />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nova rotina/i })).toBeInTheDocument();
    });
  });

  it('switches to Modelos tab when clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingProtocols />);

    await user.click(screen.getByRole('button', { name: /^modelos$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ novo modelo/i })).toBeInTheDocument();
    });
  });

  it('fetches and displays protocols on mount', async () => {
    renderWithRouter(<TrainingProtocols />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/protocols');
    });
  });

  it('shows empty state for protocols when there are none', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.resolve({ data: [] });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<TrainingProtocols />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma rotina de treino ainda')).toBeInTheDocument();
    });
  });

  it('shows empty state for templates tab when there are no templates', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.resolve({ data: [] });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<TrainingProtocols />);

    await user.click(screen.getByRole('button', { name: /^modelos$/i }));

    await waitFor(() => {
      expect(screen.getByText('Nenhum modelo de rotina ainda')).toBeInTheDocument();
    });
  });

  it('shows rotina creation form when "+ Nova Rotina" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));

    expect(screen.getByText('Criar Nova Rotina')).toBeInTheDocument();
  });

  it('calls POST to create a rotina on valid form submission', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 2, status: 'ACTIVE' } });

    const { container } = renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));

    const emailInput = screen.getByRole('textbox');
    await user.type(emailInput, 'aluno@example.com');

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols', expect.objectContaining({
        assigneeEmail: 'aluno@example.com',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Rotina criada com sucesso!', 'success');
    });
  });

  it('calls DELETE and shows success toast on rotina delete with custom confirm dialog', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.resolve({ data: mockProtocols });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: mockTemplates });
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /excluir/i }));
    await user.click(screen.getByRole('button', { name: /excluir/i }));

    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocols/1');
      expect(mockShowToast).toHaveBeenCalledWith('Rotina excluída com sucesso!', 'success');
    });
  });

  it('calls DELETE and shows success toast on template delete with custom confirm dialog', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.resolve({ data: mockProtocols });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: mockTemplates });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<TrainingProtocols />);

    await user.click(screen.getByRole('button', { name: /^modelos$/i }));
    await waitFor(() => screen.getByRole('button', { name: /excluir/i }));
    await user.click(screen.getByRole('button', { name: /excluir/i }));

    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocol-templates/1');
      expect(mockShowToast).toHaveBeenCalledWith('Modelo excluído com sucesso!', 'success');
    });
  });

  describe('inline Training Template creation', () => {
    const openTemplateForm = async (user) => {
      await user.click(screen.getByRole('button', { name: /^modelos$/i }));
      await waitFor(() => screen.getByRole('button', { name: /\+ novo modelo/i }));
      await user.click(screen.getByRole('button', { name: /\+ novo modelo/i }));
    };

    it('shows action cards when no trainings were added yet', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TrainingProtocols />);

      await openTemplateForm(user);

      expect(screen.getByRole('button', { name: /selecionar existente/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /criar novo modelo de treino/i })).toBeInTheDocument();
    });

    it('adds a training row from empty-state card and shows footer actions', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TrainingProtocols />);

      await openTemplateForm(user);
      await user.click(screen.getByRole('button', { name: /selecionar existente/i }));

      expect(screen.getByRole('button', { name: /\+ adicionar treino/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /criar novo modelo de treino/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /selecionar existente/i })).not.toBeInTheDocument();
    });

    it('opens modal when "+ Criar novo" is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TrainingProtocols />);

      await openTemplateForm(user);
      await user.click(screen.getByRole('button', { name: /criar novo modelo de treino/i }));

      const modal = document.querySelector('.bottom-sheet');
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByRole('heading', { name: /criar modelo de treino/i })).toBeInTheDocument();
    });

    it('closes modal when Cancelar is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TrainingProtocols />);

      await openTemplateForm(user);
      await user.click(screen.getByRole('button', { name: /criar novo modelo de treino/i }));

      const modal = document.querySelector('.bottom-sheet');
      expect(modal).toBeInTheDocument();

      await user.click(within(modal).getByRole('button', { name: /cancelar/i }));

      expect(document.querySelector('.bottom-sheet')).not.toBeInTheDocument();
    });

    it('creates training template and refreshes the list', async () => {
      const user = userEvent.setup();
      const createdTemplate = { id: 99, name: 'Novo Treino', category: 'strength', bodySegment: 'upper' };
      api.post.mockResolvedValue({ data: createdTemplate });

      renderWithRouter(<TrainingProtocols />);

      await openTemplateForm(user);
      await user.click(screen.getByRole('button', { name: /criar novo modelo de treino/i }));

      const modal = document.querySelector('.bottom-sheet');
      await user.type(screen.getByLabelText('Nome', { selector: '#tt-modal-name' }), 'Novo Treino');
      await user.selectOptions(within(modal).getByRole('combobox', { name: /categoria/i }), 'strength');

      await user.click(within(modal).getByRole('button', { name: /criar modelo de treino/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/trainer/training-templates', expect.objectContaining({
          name: 'Novo Treino',
          category: 'strength',
        }));
        expect(mockShowToast).toHaveBeenCalledWith('Modelo de treino criado com sucesso!', 'success');
      });

      expect(document.querySelector('.bottom-sheet')).not.toBeInTheDocument();
    });

    it('shows error toast when creation fails', async () => {
      const user = userEvent.setup();
      const errorObj = { userMessage: 'Nome já existe' };
      api.post.mockRejectedValue(errorObj);

      renderWithRouter(<TrainingProtocols />);

      await openTemplateForm(user);
      await user.click(screen.getByRole('button', { name: /criar novo modelo de treino/i }));

      const modal = document.querySelector('.bottom-sheet');
      await user.type(screen.getByLabelText('Nome', { selector: '#tt-modal-name' }), 'Duplicado');
      await user.selectOptions(within(modal).getByRole('combobox', { name: /categoria/i }), 'cardio');

      await user.click(within(modal).getByRole('button', { name: /criar modelo de treino/i }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Nome já existe', 'error');
      });
    });
  });
});
