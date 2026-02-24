import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import CreateProtocol from './CreateProtocol';
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

const mockStudent = {
  id: 'student-1',
  email: 'aluno@example.com',
  firstName: 'Aluno',
  lastName: 'Exemplo',
};

const mockTemplate = {
  id: 1,
  name: 'Modelo Base',
  description: 'Desc',
  availableWeekDays: ['monday', 'wednesday'],
  defaultDurationWeeks: 12,
  genderOrdination: 'female',
  trainingLevel: 'beginner',
  scheduleTemplatesCount: 2,
};

const mockTemplateDetail = {
  ...mockTemplate,
  scheduleTemplates: [
    {
      order: 1,
      weekDay: 'MONDAY',
      trainingTemplateId: 'tt-1',
      trainingTemplate: { id: 'tt-1', name: 'Treino A', category: 'strength' },
    },
    {
      order: 2,
      weekDay: 'WEDNESDAY',
      trainingTemplateId: 'tt-2',
      trainingTemplate: { id: 'tt-2', name: 'Treino B', category: 'cardio' },
    },
  ],
};

const mockTrainingTemplates = [
  { id: 'tt-1', name: 'Treino A', category: 'strength' },
  { id: 'tt-2', name: 'Treino B', category: 'cardio' },
];

describe('CreateProtocol', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [mockTemplate] });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocol-templates/1') return Promise.resolve({ data: mockTemplateDetail });
      return Promise.resolve({ data: [] });
    });

    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  const renderPage = (route = '/trainer/protocols/new?studentId=student-1') =>
    renderWithRoute(<CreateProtocol />, { route, path: '/trainer/protocols/new' });

  const renderPageWithoutStudent = () =>
    renderWithRoute(<CreateProtocol />, { route: '/trainer/protocols/new', path: '/trainer/protocols/new' });

  it('shows selected student from query string', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    });
  });

  it('creates protocol using selected student', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 55 } });

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.type(screen.getByLabelText('Nome da Rotina'), 'Rotina Nova');
    await user.click(screen.getByRole('checkbox', { name: /segunda/i }));
    fireEvent.change(screen.getByLabelText('Data de Início'), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText('Data de Término'), { target: { value: '31/03/2024' } });
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols', expect.objectContaining({
        assigneeId: 'student-1',
        name: 'Rotina Nova',
        availableWeekDays: ['monday'],
        startDate: '2024-01-01',
        expirationDate: '2024-03-31',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Rotina criada com sucesso!', 'success');
    });
  });

  it('shows student search field when no studentId is provided', async () => {
    renderPageWithoutStudent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar por nome ou e-mail...')).toBeInTheDocument();
    });
  });

  it('searches and selects a student via fuzzy search', async () => {
    const user = userEvent.setup({ delay: null });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [mockTemplate] });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/search') return Promise.resolve({ data: [mockStudent] });
      return Promise.resolve({ data: [] });
    });

    renderPageWithoutStudent();

    const searchInput = await screen.findByPlaceholderText('Buscar por nome ou e-mail...');
    await user.type(searchInput, 'Aluno');

    await waitFor(() => {
      expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Aluno Exemplo'));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Buscar por nome ou e-mail...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Trocar aluno')).toBeInTheDocument();
  });

  it('clears student selection when "Trocar aluno" is clicked', async () => {
    const user = userEvent.setup({ delay: null });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/search') return Promise.resolve({ data: [mockStudent] });
      return Promise.resolve({ data: [] });
    });

    renderPageWithoutStudent();

    const searchInput = await screen.findByPlaceholderText('Buscar por nome ou e-mail...');
    await user.type(searchInput, 'Aluno');

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.click(screen.getByText('Aluno Exemplo'));
    await waitFor(() => screen.getByText('Trocar aluno'));

    await user.click(screen.getByText('Trocar aluno'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar por nome ou e-mail...')).toBeInTheDocument();
    });
    expect(screen.queryByText('Trocar aluno')).not.toBeInTheDocument();
  });

  it('imports protocol from selected template', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 91 } });

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.selectOptions(screen.getByLabelText('Importar de Modelo (opcional)'), '1');
    fireEvent.change(screen.getByLabelText('Data de Início'), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText('Data de Término'), { target: { value: '31/03/2024' } });
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols/import-from-template', expect.objectContaining({
        templateId: '1',
        assigneeId: 'student-1',
        name: 'Modelo Base',
      }));
      expect(api.post.mock.calls[0][1]).not.toHaveProperty('defaultDurationWeeks');
    });
  });

  it('populates training rows when a template with schedule templates is selected', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.selectOptions(screen.getByLabelText('Importar de Modelo (opcional)'), '1');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/protocol-templates/1');
    });

    await waitFor(() => {
      const nameInputs = screen.getAllByRole('textbox', { name: /nome do treino/i });
      expect(nameInputs).toHaveLength(2);
      expect(nameInputs[0]).toHaveValue('Treino A');
      expect(nameInputs[1]).toHaveValue('Treino B');
    });
  });

  it('does not duplicate template trainings on form submit when using import-from-template', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 91 } });

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.selectOptions(screen.getByLabelText('Importar de Modelo (opcional)'), '1');

    await waitFor(() => {
      expect(screen.getAllByRole('textbox', { name: /nome do treino/i })).toHaveLength(2);
    });

    fireEvent.change(screen.getByLabelText('Data de Início'), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText('Data de Término'), { target: { value: '31/03/2024' } });
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols/import-from-template', expect.objectContaining({
        templateId: '1',
      }));
      const trainingPostCalls = api.post.mock.calls.filter(([url]) =>
        url.includes('/trainings')
      );
      expect(trainingPostCalls).toHaveLength(0);
    });
  });

  it('clears template trainings when template selection is cleared', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.selectOptions(screen.getByLabelText('Importar de Modelo (opcional)'), '1');

    await waitFor(() => {
      expect(screen.getAllByRole('textbox', { name: /nome do treino/i })).toHaveLength(2);
    });

    await user.selectOptions(screen.getByLabelText('Importar de Modelo (opcional)'), '');

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /nome do treino/i })).not.toBeInTheDocument();
    });
  });

  it('allows adding a training manually with direct fields', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 77 } });

    renderPage();

    await waitFor(() => screen.getByText('Aluno Exemplo'));
    await user.click(screen.getByRole('button', { name: /\+ adicionar treino/i }));

    const nameInput = await screen.findByRole('textbox', { name: /nome do treino 1/i });
    await user.type(nameInput, 'Treino Manual');
    await user.selectOptions(screen.getByRole('combobox', { name: /categoria do treino 1/i }), 'strength');

    await user.type(screen.getByLabelText('Nome da Rotina'), 'Rotina Direta');
    fireEvent.change(screen.getByLabelText('Data de Início'), { target: { value: '01/01/2024' } });
    fireEvent.change(screen.getByLabelText('Data de Término'), { target: { value: '31/03/2024' } });
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/trainings'), expect.objectContaining({
        name: 'Treino Manual',
        category: 'strength',
      }));
    });
  });
});
