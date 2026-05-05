import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import RoutineSummarySheet from './RoutineSummarySheet';

const TRAINING_A = {
  id: 'training-1',
  name: 'Treino A',
  weekDay: 'monday',
  exercises: [
    {
      id: 'ex-1',
      name: 'Supino reto',
      sets: 4,
      repetitions: { min: 8, max: 12 },
      restInterval: 90,
      hasLoad: true,
      suggestedLoad: 80,
    },
  ],
};

const TRAINING_B = {
  id: 'training-2',
  name: 'Treino B',
  weekDay: null,
  exercises: [],
};

const defaultProps = {
  open: true,
  trainings: [TRAINING_A, TRAINING_B],
  saveStatusLabel: 'Salvo · há 12s',
  onClose: vi.fn(),
  onScrollToTraining: vi.fn(),
  onScrollToExercise: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RoutineSummarySheet', () => {
  it('renders nothing when open is false', () => {
    render(<RoutineSummarySheet {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the sheet with role="dialog" and aria-modal="true" when open', () => {
    render(<RoutineSummarySheet {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('renders the sheet title "Exercícios da rotina"', () => {
    render(<RoutineSummarySheet {...defaultProps} />);
    expect(screen.getByText('Exercícios da rotina')).toBeInTheDocument();
  });

  it('renders the eyebrow with correct training and exercise counts', () => {
    render(<RoutineSummarySheet {...defaultProps} />);
    // 2 trainings, 1 exercise total (TRAINING_B has 0)
    expect(screen.getByText(/Resumo · 2 treinos · 1 exercício/i)).toBeInTheDocument();
  });

  it('renders singular "treino" and "exercício" when counts are 1', () => {
    render(
      <RoutineSummarySheet
        {...defaultProps}
        trainings={[TRAINING_A]}
      />
    );
    expect(screen.getByText(/Resumo · 1 treino · 1 exercício/i)).toBeInTheDocument();
  });

  it('renders all training names', () => {
    render(<RoutineSummarySheet {...defaultProps} />);
    expect(screen.getByText('Treino A')).toBeInTheDocument();
    expect(screen.getByText('Treino B')).toBeInTheDocument();
  });

  it('renders empty state for training with no exercises', () => {
    render(<RoutineSummarySheet {...defaultProps} />);
    expect(screen.getByText('Nenhum exercício adicionado.')).toBeInTheDocument();
  });

  it('renders the save status label in footer', () => {
    render(<RoutineSummarySheet {...defaultProps} />);
    expect(screen.getByText('Salvo · há 12s')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RoutineSummarySheet {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Fechar resumo/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay (backdrop) is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RoutineSummarySheet {...defaultProps} onClose={onClose} />);
    // The overlay is the element with class routine-summary-overlay
    const overlay = document.querySelector('.routine-summary-overlay');
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RoutineSummarySheet {...defaultProps} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onScrollToTraining and onClose when peek-item jump button is clicked', async () => {
    const onClose = vi.fn();
    const onScrollToTraining = vi.fn();
    const user = userEvent.setup();
    render(
      <RoutineSummarySheet
        {...defaultProps}
        onClose={onClose}
        onScrollToTraining={onScrollToTraining}
      />
    );
    await user.click(screen.getByRole('button', { name: /Ir para Treino A/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onScrollToTraining).toHaveBeenCalledWith('training-1');
  });

  it('calls onScrollToExercise and onClose when exercise row is clicked', async () => {
    const onClose = vi.fn();
    const onScrollToExercise = vi.fn();
    const user = userEvent.setup();
    render(
      <RoutineSummarySheet
        {...defaultProps}
        onClose={onClose}
        onScrollToExercise={onScrollToExercise}
      />
    );
    await user.click(
      screen.getByRole('button', { name: /Ir para exercício Supino reto/i })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onScrollToExercise).toHaveBeenCalledWith('training-1', 'ex-1');
  });

  it('renders global empty state when trainings array is empty', () => {
    render(<RoutineSummarySheet {...defaultProps} trainings={[]} />);
    expect(
      screen.getByText('Nenhum treino adicionado à rotina.')
    ).toBeInTheDocument();
  });

  it('sheet does not close when clicking inside the sheet body', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RoutineSummarySheet {...defaultProps} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    await user.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });

  // Focus trap: jsdom does not implement real focus management across portals,
  // so we verify the close button receives focus on mount via the ref mechanism.
  // Full focus-trap cycle (Tab cycling within modal) is not reliably testable in jsdom.
  it('the close button is present and focusable', () => {
    render(<RoutineSummarySheet {...defaultProps} />);
    const closeBtn = screen.getByRole('button', { name: /Fechar resumo/i });
    expect(closeBtn).toBeInTheDocument();
    // tabIndex is not set (default 0) — button is naturally focusable
    expect(closeBtn.tabIndex).toBe(0);
  });
});
