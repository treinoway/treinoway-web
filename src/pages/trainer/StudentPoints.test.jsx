import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import StudentPoints from './StudentPoints';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const mockHistoryPage = {
  data: [
    { id: 't1', action: 'workout_completed', points: 10, reason: null, createdAt: '2026-03-01T10:00:00Z' },
    { id: 't2', action: 'trainer_bonus', points: 25, reason: 'Esforço extra', createdAt: '2026-03-02T10:00:00Z' },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

describe('StudentPoints', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
  });

  it('fetches point history on mount', async () => {
    api.get.mockResolvedValue({ data: mockHistoryPage });
    renderWithRoute(<StudentPoints />, {
      route: '/trainer/students/student-1/points',
      path: '/trainer/students/:studentId/points',
    });
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/students/student-1/points?page=1&limit=20');
    });
    expect(await screen.findByText('Treino concluído')).toBeInTheDocument();
    expect(screen.getByText('Bônus do treinador')).toBeInTheDocument();
  });

  it('awards bonus via POST', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockHistoryPage });
    api.post.mockResolvedValue({ data: { id: 'new', points: 5 } });
    renderWithRoute(<StudentPoints />, {
      route: '/trainer/students/student-1/points',
      path: '/trainer/students/:studentId/points',
    });
    await screen.findByText('Treino concluído');
    await user.click(screen.getByRole('button', { name: /conceder bônus/i }));
    await user.type(screen.getByLabelText('Pontos'), '5');
    await user.type(screen.getByLabelText('Motivo (opcional)'), 'Teste');
    await user.click(screen.getByRole('button', { name: /^conceder$/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/students/student-1/bonus',
        { points: 5, reason: 'Teste' }
      );
    });
  });
});
