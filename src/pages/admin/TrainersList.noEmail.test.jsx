import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import TrainersList from './TrainersList';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const noEmailSignup = {
  trainerId: null,
  userId: 'user-9',
  firstName: 'Nina',
  lastName: 'Sememail',
  email: null,
  tier: null,
  subscriptionStatus: null,
  hasAsaasSubscription: false,
  activeStudents: null,
  studentCap: null,
  accountType: 'signup',
  inviteStatus: 'none',
  inviteSentAt: null,
};

describe('TrainersList - row without e-mail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockResolvedValue({ data: { items: [noEmailSignup], total: 1, page: 1, pageSize: 20 } });
  });

  it('disables "Enviar convite"', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainersList />);

    const row = (await screen.findByText('Nina Sememail')).closest('tr');
    await user.click(within(row).getByRole('button', { name: /ações/i }));

    const item = screen.getByRole('button', { name: 'Enviar convite' });
    expect(item).toBeDisabled();
  });
});
