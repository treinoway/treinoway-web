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

// Builds a feedback item fixture with optional field overrides.
const makeItem = (overrides = {}) => ({
  id: 'f1',
  category: 'BUG',
  categoryLabel: 'Problema',
  message: 'O botão de salvar não responde na tela de rotinas.',
  pagePath: '/trainer/routines',
  viewport: '390x844',
  userAgent: 'Mozilla/5.0',
  status: 'NEW',
  createdAt: '2026-11-03T14:30:00.000Z',
  readAt: null,
  trainer: { id: 't1', name: 'Ana Silva', email: 'ana@example.com', tier: 'BETA' },
  ...overrides,
});

const item1 = makeItem();
const item2 = makeItem({
  id: 'f2',
  category: 'PRAISE',
  categoryLabel: 'Elogio',
  message: 'Adorei o novo editor.',
  pagePath: '/trainer/students',
  trainer: { id: 't2', name: 'Bruno Costa', email: 'bruno@example.com', tier: 'BETA' },
});

// Builds a paginated API response payload for the given items.
const page = (items, extra = {}) => ({ data: { items, total: items.length, page: 1, pageSize: 20, ...extra } });

beforeEach(() => {
  vi.clearAllMocks();
  useToast.mockReturnValue({ showToast: mockShowToast });
  api.get.mockResolvedValue(page([item1, item2]));
});

describe('FeedbackList', () => {
  it('requests NEW feedbacks, page 1, pageSize 20 by default', async () => {
    renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');
    expect(api.get).toHaveBeenCalledWith('/admin/feedbacks', {
      params: expect.objectContaining({ status: 'NEW', page: 1, pageSize: 20 }),
    });
  });

  it('shows a loading skeleton while fetching', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithRouter(<FeedbackList />);
    expect(container.querySelector('.skeleton-rows')).toBeInTheDocument();
    expect(container.querySelectorAll('.row-skeleton').length).toBeGreaterThan(0);
  });

  it('renders the list in an admin-table with trainer, category badge, page and full message', async () => {
    const { container } = renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');
    expect(container.querySelector('table.admin-table')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('/trainer/routines')).toBeInTheDocument();
    expect(screen.getByText('O botão de salvar não responde na tela de rotinas.')).toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();

    const bugBadge = screen.getByText('Problema');
    expect(bugBadge).toHaveClass('badge');
    expect(screen.getByText('Elogio')).toHaveClass('badge');
  });

  it('renders the Segmented filter Novos / Lidos / Todos with Novos selected', async () => {
    const { container } = renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');
    expect(container.querySelector('.segmented')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Novos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Lidos' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'false');
  });

  it('refetches with status READ for Lidos and omits status for Todos', async () => {
    const user = userEvent.setup();
    renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');

    await user.click(screen.getByRole('tab', { name: 'Lidos' }));
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/admin/feedbacks', {
        params: expect.objectContaining({ status: 'READ', page: 1 }),
      })
    );

    await user.click(screen.getByRole('tab', { name: 'Todos' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));
    const lastParams = api.get.mock.calls.at(-1)[1].params;
    expect(lastParams).not.toHaveProperty('status');
    expect(lastParams).toEqual(expect.objectContaining({ page: 1, pageSize: 20 }));
  });

  it('shows an EmptyBlock when there are no feedbacks', async () => {
    api.get.mockResolvedValue(page([]));
    const { container } = renderWithRouter(<FeedbackList />);
    await waitFor(() => expect(container.querySelector('.empty-block')).toBeInTheDocument());
    expect(container.querySelector('.empty-block__title')).toBeInTheDocument();
    expect(container.querySelector('table.admin-table')).not.toBeInTheDocument();
  });

  it('shows pagination only when total exceeds pageSize and requests the next page', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(page([item1], { total: 45 }));
    const { container } = renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');
    expect(container.querySelector('.pagination-bar')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/admin/feedbacks', {
        params: expect.objectContaining({ status: 'NEW', page: 2 }),
      })
    );
  });

  it('does not show pagination for a single page', async () => {
    const { container } = renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');
    expect(container.querySelector('.pagination-bar')).not.toBeInTheDocument();
  });

  it('shows an error state when the list fails to load', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha ao carregar' });
    renderWithRouter(<FeedbackList />);
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Falha ao carregar', 'error'));
  });
});

describe('FeedbackList mark as read', () => {
  it('PATCHes status READ, removes the row from Novos and toasts success', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: { ...item1, status: 'READ', readAt: '2026-11-04T10:00:00.000Z' } });
    renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');

    const buttons = screen.getAllByRole('button', { name: 'Marcar como lido' });
    expect(buttons[0]).toHaveClass('btn', 'btn--secondary');
    await user.click(buttons[0]);

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/admin/feedbacks/f1', { status: 'READ' }));
    await waitFor(() => expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument());
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'success');
  });

  it('keeps the row and toasts userMessage when the PATCH fails', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue({ userMessage: 'Feedback não encontrado' });
    renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');
    await user.click(screen.getAllByRole('button', { name: 'Marcar como lido' })[0]);
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Feedback não encontrado', 'error'));
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
  });

  it('does not offer "Marcar como lido" for rows already read', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(page([makeItem({ status: 'READ', readAt: '2026-11-04T10:00:00.000Z' })]));
    renderWithRouter(<FeedbackList />);
    await screen.findByText('Ana Silva');
    await user.click(screen.getByRole('tab', { name: 'Todos' }));
    await screen.findByText('Ana Silva');
    expect(screen.queryByRole('button', { name: 'Marcar como lido' })).not.toBeInTheDocument();
    const row = screen.getByText('Ana Silva').closest('tr');
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });
});
