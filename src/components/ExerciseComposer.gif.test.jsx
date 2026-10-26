import { render, screen, fireEvent } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseComposer from './ExerciseComposer';

vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }), post: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const props = {
  snapshot: null,
  exerciseTemplates: [],
  saving: false,
  onSubmitCreate: vi.fn(),
  onSubmitEdit: vi.fn(),
  onSubmitFromLibrary: vi.fn(),
  onCancel: vi.fn(),
};

describe('ExerciseComposer — invalid GIF link', () => {
  it('blocks submit with an inline error and shows the fallback on image error', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    render(<ExerciseComposer {...props} onSubmitCreate={onSubmitCreate} />);
    await user.click(screen.getByRole('tab', { name: /Criar novo/i }));

    await user.type(screen.getByLabelText(/Nome/i), 'Agachamento');
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
    await user.type(screen.getByRole('textbox', { name: /link do gif/i }), 'https://a.com/a b.gif');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    expect(screen.getByRole('alert', { name: '' })).toBeInTheDocument();
    expect(screen.getByText(/link http\(s\) válido/i)).toBeInTheDocument();
    expect(onSubmitCreate).not.toHaveBeenCalled();

    await user.clear(screen.getByRole('textbox', { name: /link do gif/i }));
    await user.type(screen.getByRole('textbox', { name: /link do gif/i }), 'https://a.com/a.gif');
    fireEvent.error(screen.getByRole('img', { name: /prévia do gif/i }));
    expect(screen.getByText(/não foi possível carregar o gif/i)).toBeInTheDocument();
  });
});
