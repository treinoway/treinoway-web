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

// Test helper: api error.
const apiError = (userMessage, status = 409, messageCode = 'resource.conflict') =>
  Object.assign(new Error(userMessage), { userMessage, response: { status, data: { messageCode } } });

// Backend double: GETs read `server`, so a refetch after a mutation sees the mutation.
let server;

// Test helper: mock api.
const mockApi = ({ patients = [buildPatientRow()], invites = [buildInvite()] } = {}) => {
  server = { patients: [...patients], invites: [...invites] };
  api.get.mockImplementation((url) => {
    if (url === '/nutritionist/patients') return Promise.resolve({ data: { items: server.patients } });
    if (url === '/nutritionist/patient-invites') return Promise.resolve({ data: { items: server.invites } });
    return Promise.resolve({ data: {} });
  });
};

// Test helper: posted urls.
const postedUrls = () => api.post.mock.calls.map(([url]) => url);

// Test helper: render page.
const renderPage = () => renderWithRouter(<Patients />, { route: '/nutritionist/patients' });

describe('Patients (Meus Pacientes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockApi();
  });

  describe('states', () => {
    it('shows the loading state while fetching', () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      renderPage();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('shows the empty state (EmptyBlock) with a call to invite', async () => {
      mockApi({ patients: [] });
      const { container } = renderPage();

      expect(await screen.findByRole('heading', { name: 'Nenhum paciente ainda' })).toBeInTheDocument();
      expect(container.querySelector('.empty-block')).not.toBeNull();
      expect(within(container.querySelector('.empty-block')).getByRole('button', { name: 'Convidar paciente' })).toBeInTheDocument();
    });

    it('shows an error with retry when the list fails to load', async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValueOnce(apiError('Erro interno do servidor.', 500));
      renderPage();

      expect(await screen.findByText('Erro interno do servidor.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      expect(await screen.findByText('Luiza Andrade')).toBeInTheDocument();
    });
  });

  describe('patient list (criterion 4)', () => {
    it('calls GET /nutritionist/patients', async () => {
      renderPage();
      await screen.findByText('Luiza Andrade');
      expect(api.get).toHaveBeenCalledWith('/nutritionist/patients');
    });

    it('renders name, age, weight, plan status and 7-day adherence', async () => {
      renderPage();
      const row = (await screen.findByText('Luiza Andrade')).closest('tr');

      expect(within(row).getByText('29 anos')).toBeInTheDocument();
      expect(within(row).getByText('66 kg')).toBeInTheDocument();
      expect(within(row).getByText('Publicado')).toBeInTheDocument();
      expect(within(row).getByText('82%')).toBeInTheDocument();
      expect(within(row).getByText('23 de 28 refeições')).toBeInTheDocument();
    });

    it('uses the DS Avatar in the patient row (initials when there is no photo)', async () => {
      renderPage();
      const row = (await screen.findByText('Luiza Andrade')).closest('tr');

      const avatar = row.querySelector('.avatar');
      expect(avatar).not.toBeNull();
      expect(avatar).toHaveTextContent('LA');
    });

    it('shows a Rascunho Badge for a draft plan and "Sem plano" when there is none', async () => {
      mockApi({
        patients: [
          buildPatientRow({ id: 'p-draft', firstName: 'Bia', lastName: 'Souza', plan: { id: 'pl', status: 'draft', publishedAt: null, hasUnpublishedChanges: false } }),
          buildPatientRow({ id: 'p-none', firstName: 'Caio', lastName: 'Dias', plan: null, adherence7d: null }),
        ],
      });
      const { container } = renderPage();

      const draftRow = (await screen.findByText('Bia Souza')).closest('tr');
      expect(within(draftRow).getByText('Rascunho')).toBeInTheDocument();
      expect(draftRow.querySelector('.badge')).not.toBeNull();

      const noneRow = screen.getByText('Caio Dias').closest('tr');
      expect(within(noneRow).getByText('Sem plano')).toBeInTheDocument();
      expect(within(noneRow).queryByText(/%/)).not.toBeInTheDocument();
      expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    });

    it('flags a published plan that has unpublished changes', async () => {
      mockApi({
        patients: [buildPatientRow({ plan: { id: 'pl', status: 'published', publishedAt: '2026-10-20T12:00:00.000Z', hasUnpublishedChanges: true } })],
      });
      renderPage();
      const row = (await screen.findByText('Luiza Andrade')).closest('tr');
      expect(within(row).getByText('Alterações não publicadas')).toBeInTheDocument();
    });

    it('shows "-" instead of age and weight when unknown', async () => {
      mockApi({ patients: [buildPatientRow({ age: null, weightKg: null })] });
      renderPage();
      const row = (await screen.findByText('Luiza Andrade')).closest('tr');
      expect(within(row).getAllByText('-').length).toBeGreaterThanOrEqual(2);
    });

    it('links the patient to the plan summary', async () => {
      renderPage();
      const link = await screen.findByRole('link', { name: 'Luiza Andrade' });
      expect(link).toHaveAttribute('href', '/nutritionist/patients/patient-1/plan');
    });

    it('offers several row actions behind a three-dot menu', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Luiza Andrade');

      expect(screen.queryByRole('button', { name: 'Desvincular' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Ações de Luiza Andrade' }));

      expect(screen.getByRole('button', { name: 'Desvincular' })).toBeInTheDocument();
    });
  });

  describe('summary tiles', () => {
    it('counts the patients, the published plans and the average adherence', async () => {
      mockApi({
        patients: [
          buildPatientRow({ id: 'a', firstName: 'Ana', adherence7d: { done: 20, expected: 28, percent: 70 } }),
          buildPatientRow({ id: 'b', firstName: 'Bia', adherence7d: { done: 24, expected: 28, percent: 90 } }),
          buildPatientRow({ id: 'c', firstName: 'Caio', plan: null, adherence7d: null }),
        ],
      });
      renderPage();
      await screen.findByText('Ana Andrade');

      const tiles = screen.getByRole('group', { name: 'Resumo dos pacientes' });
      expect(within(tiles).getByText('Pacientes').nextElementSibling).toHaveTextContent('3');
      expect(within(tiles).getByText('Planos publicados').nextElementSibling).toHaveTextContent('2');
      expect(within(tiles).getByText('Adesão média · 7 dias').nextElementSibling).toHaveTextContent('80%');
    });

    it('shows a dash as the average when nobody has adherence data yet', async () => {
      mockApi({ patients: [buildPatientRow({ plan: null, adherence7d: null })] });
      renderPage();
      await screen.findByText('Luiza Andrade');

      expect(screen.getByText('Adesão média · 7 dias').nextElementSibling).toHaveTextContent('-');
    });

    it('hides the tiles while there are no patients', async () => {
      mockApi({ patients: [] });
      renderPage();
      await screen.findByRole('heading', { name: 'Nenhum paciente ainda' });

      expect(screen.queryByRole('group', { name: 'Resumo dos pacientes' })).not.toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('renders Pacientes and Convites tabs with Pacientes selected', async () => {
      renderPage();
      await screen.findByText('Luiza Andrade');

      expect(screen.getByRole('tab', { name: /^Pacientes/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /^Convites/ })).toHaveAttribute('aria-selected', 'false');
    });

    it('loads pending invites and lists them in the Convites tab', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Luiza Andrade');

      await user.click(screen.getByRole('tab', { name: /^Convites/ }));

      expect(await screen.findByText('maria@example.com')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/nutritionist/patient-invites', { params: { status: 'pending' } });
      expect(screen.queryByText('Luiza Andrade')).not.toBeInTheDocument();
    });

    it('shows an empty state when there are no pending invites', async () => {
      const user = userEvent.setup();
      mockApi({ invites: [] });
      renderPage();
      await screen.findByText('Luiza Andrade');

      await user.click(screen.getByRole('tab', { name: /^Convites/ }));

      expect(await screen.findByRole('heading', { name: 'Sem convites pendentes' })).toBeInTheDocument();
    });
  });

  describe('invite by e-mail (DS Modal)', () => {
    const openModal = async (user) => {
      await screen.findByText('Luiza Andrade');
      await user.click(screen.getByRole('button', { name: 'Convidar paciente' }));
      return screen.findByRole('dialog', { name: 'Convidar paciente' });
    };

    it('opens a modal with an e-mail field and closes on cancel', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openModal(user);

      expect(within(dialog).getByLabelText('E-mail do paciente')).toBeInTheDocument();
      expect(dialog.closest('.ds-overlay')).not.toBeNull();

      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('keeps submit disabled until an e-mail is typed', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openModal(user);

      expect(within(dialog).getByRole('button', { name: 'Convidar' })).toBeDisabled();
      await user.type(within(dialog).getByLabelText('E-mail do paciente'), 'novo@example.com');
      expect(within(dialog).getByRole('button', { name: 'Convidar' })).toBeEnabled();
    });

    it('links an existing account: POST, toast and the patient joins the list', async () => {
      const user = userEvent.setup();
      const newcomer = buildPatientRow({ id: 'p-new', firstName: 'Nina', lastName: 'Alves', email: 'nina@example.com' });
      api.post.mockImplementation(() => {
        server.patients.push(newcomer);
        return Promise.resolve({ data: { outcome: 'linked', patient: newcomer } });
      });
      renderPage();
      const dialog = await openModal(user);

      await user.type(within(dialog).getByLabelText('E-mail do paciente'), 'nina@example.com');
      await user.click(within(dialog).getByRole('button', { name: 'Convidar' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/nutritionist/patient-invites', { email: 'nina@example.com' }));
      expect(await screen.findByText('Nina Alves')).toBeInTheDocument();
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/vinculad/i), 'success');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('invites an e-mail without account: toast mentions the invite and it appears in Convites', async () => {
      const user = userEvent.setup();
      const invite = buildInvite({ id: 'inv-9', email: 'novo@example.com' });
      api.post.mockImplementation(() => {
        server.invites.push(invite);
        return Promise.resolve({ data: { outcome: 'invited', invite } });
      });
      renderPage();
      const dialog = await openModal(user);

      await user.type(within(dialog).getByLabelText('E-mail do paciente'), 'novo@example.com');
      await user.click(within(dialog).getByRole('button', { name: 'Convidar' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/convite/i), 'success'));
      await user.click(screen.getByRole('tab', { name: /^Convites/ }));
      expect(await screen.findByText('novo@example.com')).toBeInTheDocument();
    });

    it('shows the API error and keeps the modal open when the invite fails', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue(apiError('Este paciente já está vinculado.', 409, 'nutrition.invite.alreadyLinked'));
      renderPage();
      const dialog = await openModal(user);

      await user.type(within(dialog).getByLabelText('E-mail do paciente'), 'luiza@example.com');
      await user.click(within(dialog).getByRole('button', { name: 'Convidar' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Este paciente já está vinculado.', 'error'));
      expect(screen.getByRole('dialog', { name: 'Convidar paciente' })).toBeInTheDocument();
    });

    it('disables the form while the request is in flight', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation(() => new Promise(() => {}));
      renderPage();
      const dialog = await openModal(user);

      await user.type(within(dialog).getByLabelText('E-mail do paciente'), 'novo@example.com');
      await user.click(within(dialog).getByRole('button', { name: 'Convidar' }));

      expect(await within(dialog).findByRole('button', { name: /Convidando/ })).toBeDisabled();
      expect(within(dialog).getByLabelText('E-mail do paciente')).toBeDisabled();
    });
  });

  describe('invite actions: resend and revoke (DS ConfirmDialog)', () => {
    const openInviteMenu = async (user) => {
      await screen.findByText('Luiza Andrade');
      await user.click(screen.getByRole('tab', { name: /^Convites/ }));
      await screen.findByText('maria@example.com');
      await user.click(screen.getByRole('button', { name: 'Ações do convite maria@example.com' }));
    };

    it('resends the invite and updates the send count', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation(() => {
        server.invites = [buildInvite({ sendCount: 2 })];
        return Promise.resolve({ data: buildInvite({ sendCount: 2 }) });
      });
      renderPage();
      await openInviteMenu(user);

      await user.click(screen.getByRole('button', { name: 'Reenviar convite' }));

      await waitFor(() => expect(postedUrls()).toContain('/nutritionist/patient-invites/inv-1/resend'));
      expect(await screen.findByText(/2 envios/)).toBeInTheDocument();
    });

    it('surfaces the resend cooldown error', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue(apiError('Aguarde antes de reenviar.', 429, 'nutrition.invite.resendCooldown'));
      renderPage();
      await openInviteMenu(user);

      await user.click(screen.getByRole('button', { name: 'Reenviar convite' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Aguarde antes de reenviar.', 'error'));
    });

    it('asks for confirmation before revoking, then DELETEs and removes the row', async () => {
      const user = userEvent.setup();
      api.delete.mockImplementation(() => {
        server.invites = [];
        return Promise.resolve({ data: undefined });
      });
      const { container } = renderPage();
      await openInviteMenu(user);

      await user.click(screen.getByRole('button', { name: 'Revogar convite' }));

      const dialog = await screen.findByRole('alertdialog');
      expect(container.ownerDocument.querySelector('.ds-dialog')).not.toBeNull();
      expect(dialog).toHaveAccessibleName(expect.stringContaining('maria@example.com'));
      expect(api.delete).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole('button', { name: 'Revogar' }));

      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/nutritionist/patient-invites/inv-1'));
      await waitFor(() => expect(screen.queryByText('maria@example.com')).not.toBeInTheDocument());
    });

    it('cancelling the revoke keeps the invite and sends nothing', async () => {
      const user = userEvent.setup();
      renderPage();
      await openInviteMenu(user);
      await user.click(screen.getByRole('button', { name: 'Revogar convite' }));

      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(api.delete).not.toHaveBeenCalled();
      expect(screen.getByText('maria@example.com')).toBeInTheDocument();
    });
  });

  describe('unlink a patient (DS ConfirmDialog)', () => {
    const openUnlink = async (user) => {
      await screen.findByText('Luiza Andrade');
      await user.click(screen.getByRole('button', { name: 'Ações de Luiza Andrade' }));
      await user.click(screen.getByRole('button', { name: 'Desvincular' }));
      return screen.findByRole('alertdialog');
    };

    it('confirms, DELETEs the patient and removes the row', async () => {
      const user = userEvent.setup();
      api.delete.mockImplementation(() => {
        server.patients = [];
        return Promise.resolve({ data: undefined });
      });
      renderPage();
      const dialog = await openUnlink(user);

      expect(dialog).toHaveAccessibleName(expect.stringContaining('Luiza Andrade'));
      expect(api.delete).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole('button', { name: 'Desvincular' }));

      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/nutritionist/patients/patient-1'));
      await waitFor(() => expect(screen.queryByText('Luiza Andrade')).not.toBeInTheDocument());
    });

    it('cancel keeps the patient', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openUnlink(user);

      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(api.delete).not.toHaveBeenCalled();
      expect(screen.getByText('Luiza Andrade')).toBeInTheDocument();
    });

    it('shows an error toast and keeps the row when unlinking fails', async () => {
      const user = userEvent.setup();
      api.delete.mockRejectedValue(apiError('Falha ao desvincular.', 500));
      renderPage();
      const dialog = await openUnlink(user);

      await user.click(within(dialog).getByRole('button', { name: 'Desvincular' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Falha ao desvincular.', 'error'));
      expect(screen.getByText('Luiza Andrade')).toBeInTheDocument();
    });
  });
});
