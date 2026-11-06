import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, waitFor, within } from '../../test/test-utils';
import FeedbackList from './FeedbackList';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

// Builds a feedback item with optional overrides.
const makeItem = (overrides = {}) => ({
  id: 'f1',
  category: 'BUG',
  categoryLabel: 'Problema',
  message: 'O botão de salvar não responde.',
  pagePath: '/trainer/routines',
  status: 'NEW',
  createdAt: '2026-11-03T14:30:00.000Z',
  trainer: { id: 't1', name: 'Ana Silva', email: 'ana@example.com', tier: 'BETA' },
  ...overrides,
});

// Wraps items in the paginated admin response.
const page = (items) => ({ data: { items, total: items.length, page: 1, pageSize: 20 } });

beforeEach(() => {
  vi.clearAllMocks();
  useToast.mockReturnValue({ showToast: mockShowToast });
});

describe('FeedbackList review fixes', () => {
  it('renders the creation date in the date cell and the mobile sub-line (AC11)', async () => {
    api.get.mockResolvedValue(page([makeItem()]));
    renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');
    const row = screen.getByRole('row', { name: /Ana Silva/ });
    const cells = within(row).getAllByRole('cell');
    expect(cells[4]).toHaveTextContent('03/11/2026');
    expect(within(cells[0]).getByText('03/11/2026')).toBeInTheDocument();
  });

  it('shows a dash when the date is missing', async () => {
    api.get.mockResolvedValue(page([makeItem({ createdAt: null })]));
    renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');
    const cells = within(screen.getByRole('row', { name: /Ana Silva/ })).getAllByRole('cell');
    expect(cells[4]).toHaveTextContent('-');
  });

  it('disables the button while the PATCH runs and reloads the list afterwards', async () => {
    const user = userEvent.setup();
    let resolvePatch;
    api.patch.mockReturnValue(new Promise((resolve) => { resolvePatch = resolve; }));
    api.get.mockResolvedValueOnce(page([makeItem()])).mockResolvedValue(page([]));
    renderWithRouter(<FeedbackList />);
    await user.click(await screen.findByRole('button', { name: 'Marcar como lido' }));
    expect(screen.getByRole('button', { name: 'Marcando...' })).toBeDisabled();
    resolvePatch({ data: {} });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(mockShowToast).toHaveBeenCalledWith('Feedback marcado como lido.', 'success');
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
  });

  it('re-enables the button and toasts an error when the PATCH fails', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(page([makeItem()]));
    api.patch.mockRejectedValue({ userMessage: 'Falhou' });
    renderWithRouter(<FeedbackList />);
    await user.click(await screen.findByRole('button', { name: 'Marcar como lido' }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Falhou', 'error'));
    expect(screen.getByRole('button', { name: 'Marcar como lido' })).toBeEnabled();
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
