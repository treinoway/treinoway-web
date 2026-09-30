import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { selectOption } from '../../test-utils/selectOption';
import { renderWithRoute } from '../../test/test-utils';
import StudentAnamneses from './StudentAnamneses';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { buildAnamnesisLink, linkResponses } from '../../test/anamnesisLinkFixtures';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockStudent = {
  id: 'student-1',
  firstName: 'Aluno',
  lastName: 'Exemplo',
  email: 'aluno@example.com',
};

const mockLinkedAnamneses = [
  buildAnamnesisLink({
    id: 'anam-1',
    title: 'Anamnese de Saúde',
    response: linkResponses.submitted,
    canFill: true,
  }),
];

const mockShowToast = vi.fn();

function setup({ anamneses = [], allAnamneses = [] } = {}) {
  vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  api.get.mockImplementation((url) => {
    if (url === `/trainer/students/student-1/anamneses`) return Promise.resolve({ data: anamneses });
    if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
    if (url === '/trainer/anamneses') return Promise.resolve({ data: allAnamneses });
    return Promise.resolve({ data: [] });
  });
  return renderWithRoute(<StudentAnamneses />, {
    route: '/trainer/students/student-1/anamneses',
    path: '/trainer/students/:id/anamneses',
  });
}

describe('StudentAnamneses', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
  });

  it('shows loading state initially', () => {
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReturnValue(new Promise(() => {}));
    renderWithRoute(<StudentAnamneses />, {
      route: '/trainer/students/student-1/anamneses',
      path: '/trainer/students/:id/anamneses',
    });
    expect(screen.getByText('Carregando anamneses...')).toBeInTheDocument();
  });

  it('renders back button', async () => {
    setup();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /voltar para o aluno/i })).toBeInTheDocument(),
    );
  });

  it('back button navigates to student detail', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /voltar para o aluno/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /voltar para o aluno/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1');
  });

  it('renders "+ Vincular Anamnese" button', async () => {
    setup();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /vincular anamnese/i })).toBeInTheDocument(),
    );
  });

  it('shows empty state when no anamneses linked', async () => {
    setup();
    await waitFor(() =>
      expect(screen.getByText('Nenhuma anamnese vinculada')).toBeInTheDocument(),
    );
  });

  it('renders linked anamnesis titles', async () => {
    setup({ anamneses: mockLinkedAnamneses });
    await waitFor(() =>
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument(),
    );
  });

  const openRowMenu = async (user) => {
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Opções da anamnese Anamnese de Saúde' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Opções da anamnese Anamnese de Saúde' }));
  };

  it('groups the row actions in a menu instead of visible buttons', async () => {
    const user = userEvent.setup();
    setup({ anamneses: mockLinkedAnamneses });
    await openRowMenu(user);
    expect(screen.getByRole('button', { name: 'Preencher com o aluno' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver respostas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir template' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desvincular' })).toBeInTheDocument();
  });

  it('does not show the row actions before the menu is opened', async () => {
    setup({ anamneses: mockLinkedAnamneses });
    await waitFor(() => expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Preencher com o aluno' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver respostas' })).not.toBeInTheDocument();
  });

  it('"Preencher com o aluno" navigates to the fill route', async () => {
    const user = userEvent.setup();
    setup({ anamneses: mockLinkedAnamneses });
    await openRowMenu(user);
    await user.click(screen.getByRole('button', { name: 'Preencher com o aluno' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/anamneses/anam-1/fill');
  });

  it('"Ver respostas" navigates to the response detail route', async () => {
    const user = userEvent.setup();
    setup({ anamneses: mockLinkedAnamneses });
    await openRowMenu(user);
    await user.click(screen.getByRole('button', { name: 'Ver respostas' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/trainer/students/student-1/anamneses/anam-1/response',
    );
  });

  it('"Abrir template" navigates to the anamnesis detail route', async () => {
    const user = userEvent.setup();
    setup({ anamneses: mockLinkedAnamneses });
    await openRowMenu(user);
    await user.click(screen.getByRole('button', { name: 'Abrir template' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/anamneses/anam-1');
  });

  it('"Desvincular" opens confirm dialog', async () => {
    const user = userEvent.setup();
    setup({ anamneses: mockLinkedAnamneses });
    await openRowMenu(user);
    await user.click(screen.getByRole('button', { name: 'Desvincular' }));
    expect(
      screen.getByText(/desvincular a anamnese "anamnese de saúde"/i),
    ).toBeInTheDocument();
  });

  it('"Desvincular" confirmed calls api.delete and shows success toast', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    setup({ anamneses: mockLinkedAnamneses });
    await openRowMenu(user);
    await user.click(screen.getByRole('button', { name: 'Desvincular' }));
    const desvincularBtns = screen.getAllByRole('button', { name: /desvincular/i });
    await user.click(desvincularBtns[desvincularBtns.length - 1]);
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(
        '/trainer/students/student-1/anamneses/anam-1',
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        'Anamnese desvinculada com sucesso!',
        'success',
      );
    });
  });

  it('opens link form when "+ Vincular Anamnese" is clicked', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /\+ vincular anamnese/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /\+ vincular anamnese/i }));
    await waitFor(() =>
      expect(screen.getByLabelText('Selecionar anamnese')).toBeInTheDocument(),
    );
  });

  it('links anamnesis via picker modal and shows success toast', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: {} });
    setup({
      allAnamneses: [{ id: 'anam-1', title: 'Anamnese de Saúde', isGeneral: false }],
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /\+ vincular anamnese/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /\+ vincular anamnese/i }));
    await waitFor(() =>
      expect(screen.getByLabelText('Selecionar anamnese')).toBeInTheDocument(),
    );
    await selectOption(user, screen.getByLabelText('Selecionar anamnese'), 'anam-1');
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/students/student-1/anamneses',
        { anamnesisId: 'anam-1' },
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        'Anamnese vinculada com sucesso!',
        'success',
        expect.objectContaining({ actionLabel: 'Preencher agora' }),
      );
    });
  });

  it('the success toast offers "Preencher agora", which opens the fill route', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: {} });
    setup({
      allAnamneses: [{ id: 'anam-1', title: 'Anamnese de Saúde', isGeneral: false }],
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /\+ vincular anamnese/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /\+ vincular anamnese/i }));
    await selectOption(user, await screen.findByLabelText('Selecionar anamnese'), 'anam-1');
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalled());
    mockShowToast.mock.calls[0][2].onAction();
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/anamneses/anam-1/fill');
  });

  it('cancel button closes link form without calling api.post', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /\+ vincular anamnese/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /\+ vincular anamnese/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Selecionar anamnese')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  describe('response status', () => {
    const rowMenuName = (title) => `Opções da anamnese ${title}`;
    const openMenuOf = async (user, title) => {
      await user.click(await screen.findByRole('button', { name: rowMenuName(title) }));
    };
    const menuButton = (name) => screen.queryByRole('button', { name });

    it('shows "Pendente" when the student has not started', async () => {
      setup({ anamneses: [buildAnamnesisLink({ id: 'a1', title: 'Saúde', response: null, canFill: true })] });
      const badge = await screen.findByText('Pendente');
      expect(badge).toHaveClass('badge');
    });

    it('shows "Em preenchimento" with the answer count for a draft, never a percentage', async () => {
      setup({ anamneses: [buildAnamnesisLink({ id: 'a1', title: 'Saúde', response: linkResponses.draft, canFill: true })] });
      expect(await screen.findByText('Em preenchimento')).toBeInTheDocument();
      expect(screen.getByText('4 respostas')).toBeInTheDocument();
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });

    it('uses the singular for a single answer', async () => {
      const draft = { ...linkResponses.draft, answeredCount: 1 };
      setup({ anamneses: [buildAnamnesisLink({ id: 'a1', title: 'Saúde', response: draft, canFill: true })] });
      expect(await screen.findByText('1 resposta')).toBeInTheDocument();
    });

    it('shows the API label and a hint when the trainer filled it and awaits confirmation', async () => {
      setup({ anamneses: [buildAnamnesisLink({ id: 'a1', title: 'Saúde', response: linkResponses.awaitingByTrainer, canFill: true })] });
      expect(await screen.findByText('Aguardando confirmação')).toBeInTheDocument();
      expect(screen.getByText('Preenchida por você')).toBeInTheDocument();
    });

    it('does not show the "por você" hint when the student filled it', async () => {
      const awaiting = { ...linkResponses.awaitingByTrainer, filledBy: 'student' };
      setup({ anamneses: [buildAnamnesisLink({ id: 'a1', title: 'Saúde', response: awaiting, canFill: true })] });
      await screen.findByText('Aguardando confirmação');
      expect(screen.queryByText('Preenchida por você')).not.toBeInTheDocument();
    });

    it('shows "Respondida" with the local submission date', async () => {
      setup({ anamneses: [buildAnamnesisLink({ id: 'a1', title: 'Saúde', response: linkResponses.submitted, canFill: false })] });
      expect(await screen.findByText('Respondida')).toBeInTheDocument();
      expect(screen.getByText(new Date(linkResponses.submitted.submittedAt).toLocaleDateString('pt-BR'))).toBeInTheDocument();
    });

    it('offers "Preencher com o aluno" only when canFill is true', async () => {
      const user = userEvent.setup();
      setup({
        anamneses: [
          buildAnamnesisLink({ id: 'a1', title: 'Fillable', response: null, canFill: true }),
          buildAnamnesisLink({ id: 'a2', title: 'Locked', response: linkResponses.draft, canFill: false }),
        ],
      });
      await openMenuOf(user, 'Fillable');
      expect(menuButton('Preencher com o aluno')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: rowMenuName('Fillable') }));
      await openMenuOf(user, 'Locked');
      expect(menuButton('Preencher com o aluno')).not.toBeInTheDocument();
      expect(menuButton('Abrir template')).toBeInTheDocument();
      expect(menuButton('Desvincular')).toBeInTheDocument();
    });

    it('offers "Ver respostas" only when the response was submitted', async () => {
      const user = userEvent.setup();
      setup({
        anamneses: [
          buildAnamnesisLink({ id: 'a1', title: 'Draft', response: linkResponses.draft, canFill: true }),
          buildAnamnesisLink({ id: 'a2', title: 'Pending', response: null, canFill: true }),
          buildAnamnesisLink({ id: 'a3', title: 'Awaiting', response: linkResponses.awaitingByTrainer, canFill: false }),
        ],
      });
      await openMenuOf(user, 'Draft');
      expect(menuButton('Ver respostas')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: rowMenuName('Draft') }));
      await openMenuOf(user, 'Pending');
      expect(menuButton('Ver respostas')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: rowMenuName('Pending') }));
      await openMenuOf(user, 'Awaiting');
      expect(menuButton('Ver respostas')).toBeInTheDocument();
    });

    it('treats a link without response/canFill (older backend) as pending, fillable and with responses available', async () => {
      const user = userEvent.setup();
      setup({ anamneses: [buildAnamnesisLink({ id: 'a1', title: 'Legacy' })] });
      expect(await screen.findByText('Pendente')).toBeInTheDocument();
      await openMenuOf(user, 'Legacy');
      expect(menuButton('Preencher com o aluno')).toBeInTheDocument();
      expect(menuButton('Ver respostas')).toBeInTheDocument();
    });
  });
});
