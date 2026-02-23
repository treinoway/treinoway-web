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
    name: 'Rotina Base',
    description: 'Descricao inicial',
    availableWeekDays: ['monday', 'friday'],
    defaultDurationWeeks: 12,
    genderOrdination: 'female',
    trainingLevel: 'beginner',
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

    await user.type(screen.getByLabelText('E-mail do Aluno'), 'aluno@example.com');
    await user.type(screen.getByLabelText('Nome da Rotina'), 'Rotina Manual');
    await user.type(screen.getByLabelText('Descrição'), 'Criada sem modelo');
    await user.click(screen.getByRole('checkbox', { name: /segunda/i }));
    await user.selectOptions(screen.getByLabelText('Classificação'), 'male');
    await user.selectOptions(screen.getByLabelText('Nível de Treino'), 'advanced');
    fireEvent.change(screen.getByLabelText('Duração Padrão (semanas)'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Data de Início'), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText('Data de Término'), { target: { value: '31/03/2024' } });

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols', expect.objectContaining({
        assigneeEmail: 'aluno@example.com',
        name: 'Rotina Manual',
        description: 'Criada sem modelo',
        availableWeekDays: ['monday'],
        defaultDurationWeeks: 8,
        genderOrdination: 'male',
        trainingLevel: 'advanced',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        expirationDate: '2024-03-31',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Rotina criada com sucesso!', 'success');
    });
  });

  it('calls PATCH to update rotina with parity fields', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: { id: 1 } });

    const { container } = renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /editar/i }));

    await user.clear(screen.getByLabelText('Nome da Rotina'));
    await user.type(screen.getByLabelText('Nome da Rotina'), 'Rotina Editada');
    await user.selectOptions(screen.getByLabelText('Classificação'), 'other');
    await user.selectOptions(screen.getByLabelText('Nível de Treino'), 'intermediate');
    fireEvent.change(screen.getByLabelText('Data de Início'), { target: { value: '02/01/2024' } });
    fireEvent.change(screen.getByLabelText('Data de Término'), { target: { value: '30/04/2024' } });

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/protocols/1', expect.objectContaining({
        name: 'Rotina Editada',
        availableWeekDays: ['monday', 'friday'],
        defaultDurationWeeks: 12,
        genderOrdination: 'other',
        trainingLevel: 'intermediate',
        startDate: '2024-01-02',
        endDate: '2024-04-30',
        expirationDate: '2024-04-30',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Rotina atualizada com sucesso!', 'success');
    });
  });

  it('keeps import-from-template flow with template parity fields', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 3, status: 'ACTIVE' } });

    const { container } = renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));

    await user.type(screen.getByLabelText('E-mail do Aluno'), 'aluno@example.com');
    await user.selectOptions(screen.getByLabelText('Importar de Modelo (opcional)'), '1');
    fireEvent.change(screen.getByLabelText('Data de Início'), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText('Data de Término'), { target: { value: '31/03/2024' } });

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols/import-from-template', expect.objectContaining({
        templateId: '1',
        assigneeEmail: 'aluno@example.com',
        name: 'Modelo Base',
        description: 'Desc',
        availableWeekDays: ['monday', 'wednesday'],
        defaultDurationWeeks: 12,
        genderOrdination: 'female',
        trainingLevel: 'beginner',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        expirationDate: '2024-03-31',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Rotina criada com sucesso!', 'success');
    });
  });

  it('creates trainings right after creating a manual rotina', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.resolve({ data: { id: 55, status: 'ACTIVE' } });
      if (url === '/trainer/protocols/55/trainings') return Promise.resolve({ data: { id: 500 } });
      return Promise.resolve({ data: {} });
    });

    const { container } = renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));

    await user.type(screen.getByLabelText('E-mail do Aluno'), 'aluno@example.com');
    await user.type(screen.getByLabelText('Nome da Rotina'), 'Rotina com treino');
    fireEvent.change(screen.getByLabelText('Data de Início'), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText('Data de Término'), { target: { value: '31/03/2024' } });

    await user.click(screen.getByRole('button', { name: /adicionar treino/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: /modelo de treino 1/i }), '10');

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols', expect.objectContaining({
        name: 'Rotina com treino',
      }));
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols/55/trainings', expect.objectContaining({
        templateId: '10',
        name: 'Treino A',
        order: 1,
      }));
    });
  });

  it('creates training template from protocol modal only on rotina save', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.resolve({ data: { id: 77, status: 'ACTIVE' } });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: { id: 201, name: 'Treino novo' } });
      if (url === '/trainer/protocols/77/trainings') return Promise.resolve({ data: { id: 700 } });
      return Promise.resolve({ data: {} });
    });

    const { container } = renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));

    await user.type(screen.getByLabelText('E-mail do Aluno'), 'aluno@example.com');
    await user.type(screen.getByLabelText('Nome da Rotina'), 'Rotina com treino novo');
    fireEvent.change(screen.getByLabelText('Data de Início'), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText('Data de Término'), { target: { value: '31/03/2024' } });

    await user.click(screen.getByRole('button', { name: /criar treino/i }));

    const modal = document.querySelector('.bottom-sheet');
    await user.type(screen.getByLabelText('Nome', { selector: '#tt-modal-name' }), 'Treino novo');
    await user.selectOptions(within(modal).getByRole('combobox', { name: /categoria/i }), 'strength');
    await user.click(within(modal).getByRole('button', { name: /adicionar à rotina/i }));

    expect(api.post).not.toHaveBeenCalledWith('/trainer/training-templates', expect.anything());

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/training-templates', expect.objectContaining({
        name: 'Treino novo',
        category: 'strength',
      }));
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols/77/trainings', expect.objectContaining({
        templateId: 201,
        name: 'Treino novo',
      }));
    });
  });

  it('imports linked trainings from template when backend returns none', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.resolve({ data: mockProtocols });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: mockTemplates });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
      if (url === '/trainer/protocol-templates/1') {
        return Promise.resolve({
          data: {
            scheduleTemplates: [
              {
                order: 1,
                trainingTemplate: { id: 10, name: 'Treino A', description: 'Desc A' },
              },
              {
                order: 2,
                trainingTemplate: { id: 11, name: 'Treino B', description: 'Desc B' },
              },
            ],
          },
        });
      }
      if (url === '/trainer/protocols/91/trainings') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    api.post.mockImplementation((url) => {
      if (url === '/trainer/protocols/import-from-template') return Promise.resolve({ data: { id: 91 } });
      if (url === '/trainer/protocols/91/trainings') return Promise.resolve({ data: { id: 999 } });
      return Promise.resolve({ data: {} });
    });

    const { container } = renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.click(screen.getByRole('button', { name: /\+ nova rotina/i }));
    await user.type(screen.getByLabelText('E-mail do Aluno'), 'aluno@example.com');
    await user.selectOptions(screen.getByLabelText('Importar de Modelo (opcional)'), '1');
    fireEvent.change(screen.getByLabelText('Data de Início'), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText('Data de Término'), { target: { value: '31/03/2024' } });

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols/import-from-template', expect.objectContaining({
        templateId: '1',
      }));
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols/91/trainings', expect.objectContaining({
        templateId: 10,
        name: 'Treino A',
        order: 1,
      }));
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols/91/trainings', expect.objectContaining({
        templateId: 11,
        name: 'Treino B',
        order: 2,
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Treinos do modelo sincronizados automaticamente.', 'success');
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
