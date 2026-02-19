import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import ProtocolDetail from './ProtocolDetail';
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

const mockProtocol = {
  id: 1,
  status: 'ACTIVE',
  startDate: '2024-01-01T00:00:00.000Z',
  endDate: '2024-03-31T00:00:00.000Z',
  assignee: { name: 'Aluno Teste', email: 'aluno@example.com' },
};

const mockTrainings = [
  {
    id: 10,
    name: 'Treino de Peito',
    description: 'Exercícios de peito',
    order: 1,
    schedules: [],
  },
];

const mockTrainingTemplates = [
  { id: 5, name: 'Template X' },
];

function renderProtocolDetail() {
  return renderWithRoute(<ProtocolDetail />, {
    route: '/trainer/protocols/1',
    path: '/trainer/protocols/:id',
  });
}

describe('ProtocolDetail', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });

    api.get.mockImplementation((url) => {
      if (url.endsWith('/trainer/protocols/1')) return Promise.resolve({ data: mockProtocol });
      if (url.includes('/trainings') && !url.includes('training-templates')) return Promise.resolve({ data: mockTrainings });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: mockTrainingTemplates });
      return Promise.resolve({ data: [] });
    });

    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('shows loading state while protocol data is fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderProtocolDetail();

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders protocol info after loading', async () => {
    renderProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText(/aluno teste/i)).toBeInTheDocument();
    });
  });

  it('renders the trainings list', async () => {
    renderProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Treino de Peito')).toBeInTheDocument();
    });
  });

  it('shows empty state when protocol has no trainings', async () => {
    api.get.mockImplementation((url) => {
      if (url.endsWith('/trainer/protocols/1')) return Promise.resolve({ data: mockProtocol });
      if (url.includes('/trainings')) return Promise.resolve({ data: [] });
      if (url === '/trainer/training-templates') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Nenhum treino ainda')).toBeInTheDocument();
    });
  });

  it('shows the training form when "+ Adicionar Treino" is clicked', async () => {
    const user = userEvent.setup();
    renderProtocolDetail();

    await waitFor(() => screen.getByText(/aluno teste/i));
    await user.click(screen.getByRole('button', { name: /adicionar treino/i }));

    expect(screen.getByText('Adicionar Novo Treino')).toBeInTheDocument();
  });

  it('calls POST to create a training on form submission', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 11, name: 'Novo Treino' } });

    const { container } = renderProtocolDetail();

    await waitFor(() => screen.getByText(/aluno teste/i));
    await user.click(screen.getByRole('button', { name: /adicionar treino/i }));

    const nameInput = screen.getAllByRole('textbox')[0];
    await user.type(nameInput, 'Novo Treino');

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/protocols/1/trainings',
        expect.objectContaining({ name: 'Novo Treino' })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Treino criado com sucesso!', 'success');
    });
  });

  it('calls DELETE and shows success toast when deleting a training', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.delete.mockResolvedValue({});

    renderProtocolDetail();

    await waitFor(() => screen.getByText('Treino de Peito'));
    await user.click(screen.getByRole('button', { name: /excluir/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocols/1/trainings/10');
      expect(mockShowToast).toHaveBeenCalledWith('Treino excluído com sucesso!', 'success');
    });
  });

  it('renders a back button that navigates to the protocols list', async () => {
    renderProtocolDetail();

    await waitFor(() => screen.getByText(/aluno teste/i));

    expect(screen.getByRole('button', { name: /voltar para protocolos/i })).toBeInTheDocument();
  });
});
