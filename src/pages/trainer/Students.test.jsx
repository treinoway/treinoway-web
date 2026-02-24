import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import Students from './Students';
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

describe('Students', () => {
  beforeEach(() => {
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') {
        return Promise.resolve({
          data: [{ id: 'student-1', firstName: 'Aluno', lastName: 'Exemplo', email: 'aluno@example.com' }],
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('shows "Criar Rotina" link in student row menu', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => {
      expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ações do aluno/i }));

    const createProtocolLink = screen.getByRole('link', { name: /criar rotina/i });
    expect(createProtocolLink).toBeInTheDocument();
    expect(createProtocolLink).toHaveAttribute('href', '/trainer/protocols/new?studentId=student-1');
  });
});
