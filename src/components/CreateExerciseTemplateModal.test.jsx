import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateExerciseTemplateModal from './CreateExerciseTemplateModal';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../constants/exerciseTypes', () => ({
  EXERCISE_TYPE_OPTIONS: [
    { value: 'strength', label: 'Força' },
    { value: 'cardio', label: 'Cardio' },
  ],
}));

const mockShowToast = vi.fn();
const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();

const renderModal = (props = {}) =>
  render(
    <CreateExerciseTemplateModal
      open={true}
      onClose={mockOnClose}
      onSuccess={mockOnSuccess}
      {...props}
    />
  );

describe('CreateExerciseTemplateModal', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockOnClose.mockReset();
    mockOnSuccess.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.post.mockReset();
    api.patch.mockReset();
  });

  it('renders the modal when open is true', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: 'Criar exercício' })).toBeInTheDocument();
  });

  it('does not render the modal when open is false', () => {
    render(
      <CreateExerciseTemplateModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(screen.queryByText('Criar exercício')).not.toBeInTheDocument();
  });

  it('renders edit title when exerciseTemplate is provided', () => {
    renderModal({ exerciseTemplate: { id: 10, name: 'Supino', type: 'strength' } });
    expect(screen.getByRole('heading', { name: 'Editar exercício' })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /fechar/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not call onClose when the overlay is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderModal();

    const overlay = container.querySelector('.overlay');
    await user.click(overlay);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('renders the form with correct fields', () => {
    renderModal();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tornar este modelo público/i)).toBeInTheDocument();
  });
});
