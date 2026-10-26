import { render, screen, fireEvent } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseTemplateForm from './ExerciseTemplateForm';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

describe('ExerciseTemplateForm — invalid GIF link', () => {
  beforeEach(() => {
    api.post.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  it('blocks submit with an inline error', async () => {
    const user = userEvent.setup();
    render(<ExerciseTemplateForm onCancel={vi.fn()} onSuccess={vi.fn()} onNameChange={vi.fn()} />);

    await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
    await user.click(screen.getByRole('radio', { name: /força/i }));
    await user.type(screen.getByLabelText(/link do gif/i), 'HTTPS://a.com/a.gif');
    await user.click(screen.getByRole('button', { name: /salvar|criar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/link http\(s\) válido/i);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows a fallback when the GIF preview fails to load', async () => {
    const user = userEvent.setup();
    render(<ExerciseTemplateForm onCancel={vi.fn()} onSuccess={vi.fn()} onNameChange={vi.fn()} />);

    await user.type(screen.getByLabelText(/link do gif/i), 'https://a.com/a.gif');
    fireEvent.error(screen.getByRole('img', { name: /prévia do gif/i }));

    expect(screen.getByText(/não foi possível carregar o gif/i)).toBeInTheDocument();
  });
});
