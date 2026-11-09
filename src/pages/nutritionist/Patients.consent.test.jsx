import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, waitFor, within } from '../../test/test-utils';
import Patients from './Patients';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { buildInvite, buildPatientRow } from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const showToast = vi.fn();

// Backend double: GETs read `server`, so a refetch after an invite sees it.
let server;

// Test helper: mock api (the service always answers `invited` and never links on invite — crit. 32).
const mockApi = ({ invites = [buildInvite()] } = {}) => {
  server = { patients: [buildPatientRow()], invites: [...invites] };
  api.get.mockImplementation((url) => {
    if (url === '/nutritionist/patients') return Promise.resolve({ data: { items: server.patients } });
    if (url === '/nutritionist/patient-invites') return Promise.resolve({ data: { items: server.invites } });
    return Promise.resolve({ data: {} });
  });
  api.post.mockImplementation((url, body) => {
    if (url === '/nutritionist/patient-invites') {
      const invite = buildInvite({ id: 'inv-new', email: body.email });
      server.invites = [...server.invites, invite];
      return Promise.resolve({ data: { outcome: 'invited', invite } });
    }
    return Promise.resolve({ data: buildInvite({ id: 'inv-2', status: 'pending' }) });
  });
};

// Test helper: render page.
const renderPage = () => renderWithRouter(<Patients />, { route: '/nutritionist/patients' });

// Test helper: opens the Convites tab.
const openInvitesTab = async (user) => {
  await screen.findByText('Luiza Andrade');
  await user.click(screen.getByRole('tab', { name: /Convites/ }));
};

describe('Patients — patient consent (criteria 32 and 35, fix round)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockApi();
  });

  describe('invite modal copy (crit. 32)', () => {
    it('never promises an immediate link: the patient has to accept', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Luiza Andrade');

      await user.click(screen.getByRole('button', { name: 'Convidar paciente' }));
      const dialog = await screen.findByRole('dialog', { name: 'Convidar paciente' });

      expect(within(dialog).queryByText(/vinculado na hora/i)).not.toBeInTheDocument();
      expect(within(dialog).getByText(/aceit/i)).toBeInTheDocument();
    });

    it('toasts the invited copy after inviting and closes the modal', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Luiza Andrade');

      await user.click(screen.getByRole('button', { name: 'Convidar paciente' }));
      await user.type(await screen.findByLabelText('E-mail do paciente'), 'nova@example.com');
      await user.click(screen.getByRole('button', { name: 'Convidar' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Convite enviado para nova@example.com.', 'success'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Convites tab reload', () => {
    it('shows the new invite right away when inviting from the Convites tab', async () => {
      const user = userEvent.setup();
      renderPage();
      await openInvitesTab(user);
      expect(await screen.findByText('maria@example.com')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Convidar paciente' }));
      await user.type(await screen.findByLabelText('E-mail do paciente'), 'nova@example.com');
      await user.click(screen.getByRole('button', { name: 'Convidar' }));

      expect(await screen.findByText('nova@example.com')).toBeInTheDocument();
      expect(screen.getByText('maria@example.com')).toBeInTheDocument();
    });
  });

  describe('declined invite (crit. 35)', () => {
    const declined = () => buildInvite({ id: 'inv-2', email: 'recusou@example.com', status: 'declined' });

    it('shows the status "Recusado" only on the declined invite', async () => {
      const user = userEvent.setup();
      mockApi({ invites: [buildInvite(), declined()] });
      renderPage();
      await openInvitesTab(user);

      const declinedRow = (await screen.findByText('recusou@example.com')).closest('tr');
      expect(within(declinedRow).getByText('Recusado')).toBeInTheDocument();
      const pendingRow = screen.getByText('maria@example.com').closest('tr');
      expect(within(pendingRow).queryByText('Recusado')).not.toBeInTheDocument();
    });

    it('lets the nutritionist resend a declined invite', async () => {
      const user = userEvent.setup();
      mockApi({ invites: [declined()] });
      renderPage();
      await openInvitesTab(user);

      await user.click(await screen.findByRole('button', { name: 'Ações do convite recusou@example.com' }));
      const resend = screen.getByRole('button', { name: 'Reenviar convite' });
      expect(resend).toBeEnabled();
      await user.click(resend);

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/nutritionist/patient-invites/inv-2/resend'));
    });
  });
});
