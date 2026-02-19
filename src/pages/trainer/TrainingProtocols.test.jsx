import { screen, waitFor, fireEvent } from '@testing-library/react';
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
  { id: 1, name: 'Modelo Base', description: 'Desc', availableWeekDays: [], defaultDurationWeeks: 12 },
];

describe('TrainingProtocols', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.resolve({ data: mockProtocols });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: mockTemplates });
      return Promise.resolve({ data: [] });
    });

    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('renders the page title', () => {
    renderWithRouter(<TrainingProtocols />);

    expect(screen.getByText('Protocolos de Treino')).toBeInTheDocument();
  });

  it('renders tab buttons for Protocolos and Modelos', () => {
    renderWithRouter(<TrainingProtocols />);

    expect(screen.getByRole('button', { name: /^protocolos$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^modelos$/i })).toBeInTheDocument();
  });

  it('shows Protocolos tab content by default', async () => {
    renderWithRouter(<TrainingProtocols />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ novo protocolo/i })).toBeInTheDocument();
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
      expect(screen.getByText('Nenhum protocolo de treino ainda')).toBeInTheDocument();
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
      expect(screen.getByText('Nenhum modelo de protocolo ainda')).toBeInTheDocument();
    });
  });

  it('shows protocol creation form when "+ Novo Protocolo" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /\+ novo protocolo/i }));
    await user.click(screen.getByRole('button', { name: /\+ novo protocolo/i }));

    expect(screen.getByText('Criar Novo Protocolo')).toBeInTheDocument();
  });

  it('calls POST to create a protocol on valid form submission', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 2, status: 'ACTIVE' } });

    const { container } = renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /\+ novo protocolo/i }));
    await user.click(screen.getByRole('button', { name: /\+ novo protocolo/i }));

    const emailInput = screen.getByRole('textbox');
    await user.type(emailInput, 'aluno@example.com');

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocols', expect.objectContaining({
        assigneeEmail: 'aluno@example.com',
      }));
      expect(mockShowToast).toHaveBeenCalledWith('Protocolo criado com sucesso!', 'success');
    });
  });

  it('calls DELETE and shows success toast on protocol delete with confirm', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.delete.mockResolvedValue({});
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.resolve({ data: mockProtocols });
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: mockTemplates });
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<TrainingProtocols />);

    await waitFor(() => screen.getByRole('button', { name: /excluir/i }));
    await user.click(screen.getByRole('button', { name: /excluir/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocols/1');
      expect(mockShowToast).toHaveBeenCalledWith('Protocolo excluído com sucesso!', 'success');
    });
  });
});
