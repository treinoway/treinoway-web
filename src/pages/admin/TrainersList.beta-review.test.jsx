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
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

// Builds a trainer row with a paid Asaas subscription by default.
const buildTrainer =(overrides) => ({
  trainerId: 'trainer-1',
  userId: 'user-1',
  firstName: 'Paula',
  lastName: 'Paga',
  email: 'paula@example.com',
  tier: 'PRO',
  subscriptionStatus: 'ACTIVE',
  hasAsaasSubscription: true,
  activeStudents: 5,
  studentCap: 30,
  ...overrides,
});

const hint = 'Beta indisponível: o treinador tem assinatura paga ativa no Asaas.';

// Opens the change-plan dialog for the given trainer and returns the dialog element.
const openDialog = async (user, name) => {
  await user.click(await screen.findByRole('button', { name: `Alterar plano de ${name}` }));
  return screen.findByRole('dialog');
};

describe('TrainersList - BETA blocked by paid Asaas subscription', () => {
  beforeEach(() => {
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockReset();
  });

  it('disables the BETA option and explains why when the trainer has an Asaas subscription', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: { items: [buildTrainer()], total: 1, page: 1, pageSize: 20 } });
    renderWithRouter(<TrainersList />);

    const dialog = await openDialog(user, 'Paula Paga');
    await user.click(within(dialog).getByRole('combobox', { name: 'Novo plano' }));

    expect(within(dialog).getByText(hint)).toBeInTheDocument();
    expect(document.querySelector('[data-value="BETA"]')).toHaveAttribute('class', expect.stringContaining('--disabled'));
  });

  it('keeps BETA selectable and shows no hint when there is no Asaas subscription', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({
      data: { items: [buildTrainer({ hasAsaasSubscription: false, subscriptionStatus: null })], total: 1, page: 1, pageSize: 20 },
    });
    renderWithRouter(<TrainersList />);

    const dialog = await openDialog(user, 'Paula Paga');
    await user.click(within(dialog).getByRole('combobox', { name: 'Novo plano' }));

    expect(within(dialog).queryByText(hint)).not.toBeInTheDocument();
    expect(document.querySelector('[data-value="BETA"]')?.className).not.toContain('--disabled');
  });
});
