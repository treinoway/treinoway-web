import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import TrainersList from './TrainersList';
import { listTrainers } from '../../api/admin';

vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../api/admin', () => ({ listTrainers: vi.fn(), changeTrainerPlan: vi.fn() }));

const base = { tier: 'PRO', hasAsaasSubscription: false, activeStudents: 1, studentCap: 20 };
// Builds a paginated list response.
const page = (items, total = items.length) => ({ items, total, page: 1, pageSize: 20 });

describe('TrainersList review fixes', () => {
  beforeEach(() => {
    vi.mocked(listTrainers).mockReset();
  });

  it('shows a dash when name and email are null, never "null"', async () => {
    vi.mocked(listTrainers).mockResolvedValue(
      page([{ ...base, trainerId: 't1', firstName: null, lastName: null, email: null, subscriptionStatus: null }])
    );
    render(<TrainersList />);
    expect(await screen.findByRole('button', { name: 'Ações de —' })).toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });

  it('shows a status badge only for non-ACTIVE statuses', async () => {
    vi.mocked(listTrainers).mockResolvedValue(
      page([
        { ...base, trainerId: 't1', firstName: 'Ana', lastName: null, email: 'a@x.com', subscriptionStatus: 'PAST_DUE' },
        { ...base, trainerId: 't2', firstName: 'Bia', lastName: null, email: 'b@x.com', subscriptionStatus: 'CANCELED' },
        { ...base, trainerId: 't3', firstName: 'Cris', lastName: null, email: 'c@x.com', subscriptionStatus: 'ACTIVE' },
      ])
    );
    render(<TrainersList />);
    expect(await screen.findByText('Pagamento em atraso')).toHaveClass('badge--warning');
    expect(screen.getByText('Cancelada')).toHaveClass('badge--error');
    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument();
  });

  it('keeps previous rows rendered while refetching a search', async () => {
    const user = userEvent.setup();
    const first = page([{ ...base, trainerId: 't1', firstName: 'Ana', lastName: null, email: 'a@x.com', subscriptionStatus: null }]);
    vi.mocked(listTrainers).mockImplementation(({ search }) => (search ? new Promise(() => {}) : Promise.resolve(first)));
    render(<TrainersList />);
    await screen.findByText('Ana');
    await user.type(screen.getByRole('textbox'), 'z');
    await waitFor(() => expect(listTrainers).toHaveBeenCalledWith(expect.objectContaining({ search: 'z' })));
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
  });
});
