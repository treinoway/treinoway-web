import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import InvitesList from './InvitesList';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

describe('InvitesList email filter', () => {
  beforeEach(() => {
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(api.get).mockResolvedValue({ data: { items: [], total: 0, page: 1, pageSize: 20 } });
  });

  it('sends the trimmed email in the GET query', async () => {
    const user = userEvent.setup();
    renderWithRouter(<InvitesList />);
    await user.type(screen.getByLabelText('Buscar por e-mail'), '  ana@x.com  ');

    await waitFor(() => {
      const urls = vi.mocked(api.get).mock.calls.map(([url]) => url);
      expect(urls.some((url) => url.includes('email=ana%40x.com') && !url.includes('%20'))).toBe(true);
    });
  });
});
