import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { selectOption } from '../../test-utils/selectOption';
import { renderWithRoute } from '../../test/test-utils';
import StudentAnamneses from './StudentAnamneses';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

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
  {
    id: 'link-1',
    createdAt: '2026-01-15',
    anamnesis: { id: 'anam-1', title: 'Anamnese de Saúde', isGeneral: false },
  },
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

  it('renders "Ver respostas" and "Abrir template" buttons for each linked anamnesis', async () => {
    setup({ anamneses: mockLinkedAnamneses });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Ver respostas' })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Abrir template' })).toBeInTheDocument();
  });

  it('"Ver respostas" navigates to the response detail route', async () => {
    const user = userEvent.setup();
    setup({ anamneses: mockLinkedAnamneses });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Ver respostas' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Ver respostas' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/trainer/students/student-1/anamneses/anam-1/response',
    );
  });

  it('"Abrir template" navigates to the anamnesis detail route', async () => {
    const user = userEvent.setup();
    setup({ anamneses: mockLinkedAnamneses });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Abrir template' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Abrir template' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/anamneses/anam-1');
  });

  it('"Desvincular" opens confirm dialog', async () => {
    const user = userEvent.setup();
    setup({ anamneses: mockLinkedAnamneses });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Desvincular' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Desvincular' }));
    expect(
      screen.getByText(/desvincular a anamnese "anamnese de saúde"/i),
    ).toBeInTheDocument();
  });

  it('"Desvincular" confirmed calls api.delete and shows success toast', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    setup({ anamneses: mockLinkedAnamneses });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Desvincular' })).toBeInTheDocument(),
    );
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
      );
    });
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
});
