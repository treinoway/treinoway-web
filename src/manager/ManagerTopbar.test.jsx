import { screen, renderWithRouter } from '../test/test-utils';
import ManagerLayout from './ManagerLayout';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

describe('Manager top bar', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: { pendingInvites: 0, newFeedbacks: 0 } });
  });

  it('renders the Teufit Manager title, a link back to the app home and the content', () => {
    renderWithRouter(
      <ManagerLayout>
        <span>Conteúdo</span>
      </ManagerLayout>
    );

    expect(screen.getByText('Teufit Manager')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voltar ao app/ })).toHaveAttribute('href', '/');
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });
});
