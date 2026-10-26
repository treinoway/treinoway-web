import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithRouter } from '../../test/test-utils';
import AiUsage from './AiUsage';
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

const usageResponse = {
  month: '2026-10',
  totals: {
    inputTokens: 1500000,
    outputTokens: 250000,
    cacheReadTokens: 800000,
    cacheWriteTokens: 40000,
    totalTokens: 2590000,
    turns: 321,
  },
  trainers: [
    {
      trainerId: 'trainer-1',
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@example.com',
      tier: 'PRO',
      inputTokens: 1000000,
      outputTokens: 150000,
      cacheReadTokens: 500000,
      cacheWriteTokens: 30000,
      totalTokens: 1680000,
      turns: 200,
    },
    {
      trainerId: 'trainer-2',
      firstName: null,
      lastName: null,
      email: 'bruno@example.com',
      tier: 'DIAMOND',
      inputTokens: 500000,
      outputTokens: 100000,
      cacheReadTokens: 300000,
      cacheWriteTokens: 10000,
      totalTokens: 910000,
      turns: 121,
    },
  ],
};

const emptyResponse = {
  month: '2026-10',
  totals: {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0,
    turns: 0,
  },
  trainers: [],
};

// Asserts that the summary card with the given label shows the expected value.
const expectCard = (label, value) => {
  expect(screen.getByText(label).parentElement).toHaveTextContent(value);
};

describe('AiUsage', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.get.mockResolvedValue({ data: usageResponse });
  });

  it('renders the page title', async () => {
    renderWithRouter(<AiUsage />);

    expect(screen.getByRole('heading', { name: 'Uso do iArnold' })).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalled());
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<AiUsage />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('fetches /admin/ai-usage for the month selected by default', async () => {
    renderWithRouter(<AiUsage />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/admin/ai-usage',
        { params: { month: expect.stringMatching(/^\d{4}-(0[1-9]|1[0-2])$/) } }
      );
    });
  });

  it('shows the month totals as cards', async () => {
    renderWithRouter(<AiUsage />);

    await waitFor(() => screen.getByText('Tokens de entrada'));

    expectCard('Tokens de entrada', '1.500.000');
    expectCard('Tokens de saída', '250.000');
    expectCard('Cache lido', '800.000');
    expectCard('Cache escrito', '40.000');
    expectCard('Total de tokens', '2.590.000');
    expectCard('Turnos', '321');
  });

  it('shows the per-trainer table, falling back to the email when there is no name', async () => {
    renderWithRouter(<AiUsage />);

    await waitFor(() => screen.getByText('Ana Silva'));

    const anaRow = screen.getByRole('row', { name: /Ana Silva/ });
    expect(within(anaRow).getByText('Pro')).toBeInTheDocument();
    expect(within(anaRow).getByText('1.680.000')).toBeInTheDocument();
    expect(within(anaRow).getByText('200')).toBeInTheDocument();

    const brunoRow = screen.getByRole('row', { name: /bruno@example.com/ });
    expect(within(brunoRow).getByText('Diamond')).toBeInTheDocument();
    expect(within(brunoRow).getByText('910.000')).toBeInTheDocument();
  });

  it('refetches with the new month when the month changes', async () => {
    renderWithRouter(<AiUsage />);
    await waitFor(() => screen.getByText('Ana Silva'));

    fireEvent.change(screen.getByLabelText('Mês'), { target: { value: '2026-09' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith('/admin/ai-usage', { params: { month: '2026-09' } });
    });
  });

  it('explains that counting started at deploy when there is no usage', async () => {
    api.get.mockResolvedValue({ data: emptyResponse });

    renderWithRouter(<AiUsage />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum uso registrado neste mês')).toBeInTheDocument();
    });
    expect(screen.getByText(/a contagem de tokens começou no deploy/i)).toBeInTheDocument();
  });

  it('shows an error state and an error toast when loading fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha de rede' });

    renderWithRouter(<AiUsage />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Falha de rede', 'error');
    });
    expect(screen.getByText('Não foi possível carregar o uso de tokens.')).toBeInTheDocument();
  });
});
