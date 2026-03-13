import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateExerciseModal from './CreateExerciseModal';
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
    <CreateExerciseModal
      open={true}
      onClose={mockOnClose}
      onSuccess={mockOnSuccess}
      trainingId="training-1"
      {...props}
    />
  );

describe('CreateExerciseModal', () => {
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
    expect(screen.getByRole('heading', { name: 'Criar Exercício' })).toBeInTheDocument();
  });

  it('does not render the modal when open is false', () => {
    render(
      <CreateExerciseModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} trainingId="training-1" />
    );
    expect(screen.queryByText('Criar Exercício')).not.toBeInTheDocument();
  });

  it('renders custom title when provided', () => {
    renderModal({ title: 'Adicionar Exercício' });
    expect(screen.getByRole('heading', { name: 'Adicionar Exercício' })).toBeInTheDocument();
  });

  it('renders edit title when exercise is provided', () => {
    renderModal({ exercise: { id: 'ex-1', name: 'Supino', type: 'strength' } });
    expect(screen.getByRole('heading', { name: 'Editar Exercício' })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /fechar/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when the overlay is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderModal();

    const overlay = container.querySelector('.overlay');
    await user.click(overlay);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders headerContent inside the modal body', () => {
    renderModal({ headerContent: <div>Segmented Toggle</div> });
    expect(screen.getByText('Segmented Toggle')).toBeInTheDocument();
  });

  it('does not show isPublic checkbox', () => {
    renderModal();
    expect(screen.queryByLabelText(/público/i)).not.toBeInTheDocument();
  });

  it('renders the form with correct fields', () => {
    renderModal();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
  });
});
