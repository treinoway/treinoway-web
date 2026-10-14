import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import RoutineSummarySheetItem from './RoutineSummarySheetItem';

const makeTraining = (overrides = {}) => ({
  id: 'training-1',
  name: 'Treino A',
  weekDay: 'monday',
  exercises: [],
  ...overrides,
});

const EXERCISE_FULL = {
  id: 'ex-1',
  name: 'Supino reto',
  sets: 4,
  repetitions: { min: 8, max: 12 },
  restInterval: 90,
  hasLoad: true,
  suggestedLoad: 80,
};

const EXERCISE_PARTIAL = {
  id: 'ex-2',
  name: 'Agachamento',
  sets: 3,
  repetitions: { min: 10, max: 10 },
  restInterval: null,
  hasLoad: false,
  suggestedLoad: null,
};

const defaultProps = {
  training: makeTraining(),
  index: 0,
  onJumpToTraining: vi.fn(),
  onJumpToExercise: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RoutineSummarySheetItem', () => {
  it('renders training name', () => {
    render(<RoutineSummarySheetItem {...defaultProps} />);
    expect(screen.getByText('Treino A')).toBeInTheDocument();
  });

  it('renders letter chip from index (index 0 → "A")', () => {
    render(<RoutineSummarySheetItem {...defaultProps} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders letter "C" for index 2', () => {
    render(
      <RoutineSummarySheetItem
        {...defaultProps}
        training={makeTraining({ name: 'Treino C' })}
        index={2}
      />
    );
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders weekday chip with set label when weekDay is set', () => {
    render(<RoutineSummarySheetItem {...defaultProps} />);
    // monday → "Segunda" (WEEK_DAY_OPTIONS_SHORT)
    expect(screen.getByText('Segunda')).toBeInTheDocument();
  });

  it('renders unassigned weekday chip when weekDay is null', () => {
    render(
      <RoutineSummarySheetItem
        {...defaultProps}
        training={makeTraining({ weekDay: null })}
      />
    );
    expect(screen.getByText('Sem dia')).toBeInTheDocument();
  });

  it('renders exercise count label "0 ex" when no exercises', () => {
    render(<RoutineSummarySheetItem {...defaultProps} />);
    expect(screen.getByText('0 ex')).toBeInTheDocument();
  });

  it('renders "1 ex" for singular exercise', () => {
    render(
      <RoutineSummarySheetItem
        {...defaultProps}
        training={makeTraining({ exercises: [EXERCISE_FULL] })}
      />
    );
    expect(screen.getByText('1 ex')).toBeInTheDocument();
  });

  it('renders "2 ex" for two exercises', () => {
    render(
      <RoutineSummarySheetItem
        {...defaultProps}
        training={makeTraining({ exercises: [EXERCISE_FULL, EXERCISE_PARTIAL] })}
      />
    );
    expect(screen.getByText('2 ex')).toBeInTheDocument();
  });

  it('renders empty state when exercises array is empty', () => {
    render(<RoutineSummarySheetItem {...defaultProps} />);
    expect(screen.getByText('Nenhum exercício adicionado.')).toBeInTheDocument();
  });

  it('renders exercise rows when exercises present', () => {
    render(
      <RoutineSummarySheetItem
        {...defaultProps}
        training={makeTraining({ exercises: [EXERCISE_FULL] })}
      />
    );
    expect(screen.getByText('Supino reto')).toBeInTheDocument();
    expect(screen.getByText('4×8–12')).toBeInTheDocument();
  });

  it('shows a success "Pronto" tag when exercises.length >= 3', () => {
    render(
      <RoutineSummarySheetItem
        {...defaultProps}
        training={makeTraining({
          exercises: [EXERCISE_FULL, EXERCISE_PARTIAL, EXERCISE_FULL],
        })}
      />
    );
    expect(screen.getByText('Pronto')).toHaveClass('badge--success');
  });

  it('shows a warning "Parcial" tag when exercises.length is 1 or 2', () => {
    render(
      <RoutineSummarySheetItem
        {...defaultProps}
        training={makeTraining({ exercises: [EXERCISE_FULL] })}
      />
    );
    expect(screen.getByText('Parcial')).toHaveClass('badge--warning');
  });

  it('shows a neutral "Vazio" tag when training has no exercises', () => {
    render(<RoutineSummarySheetItem {...defaultProps} />);
    expect(screen.getByText('Vazio')).toHaveClass('badge--neutral');
  });

  it('calls onJumpToTraining with training id when jump button clicked', async () => {
    const onJumpToTraining = vi.fn();
    const user = userEvent.setup();
    render(
      <RoutineSummarySheetItem
        {...defaultProps}
        onJumpToTraining={onJumpToTraining}
      />
    );
    await user.click(screen.getByRole('button', { name: /Ir para Treino A/i }));
    expect(onJumpToTraining).toHaveBeenCalledWith('training-1');
  });

  it('calls onJumpToExercise with correct ids when exercise row clicked', async () => {
    const onJumpToExercise = vi.fn();
    const user = userEvent.setup();
    render(
      <RoutineSummarySheetItem
        {...defaultProps}
        training={makeTraining({ exercises: [EXERCISE_FULL] })}
        onJumpToExercise={onJumpToExercise}
      />
    );
    await user.click(screen.getByRole('button', { name: /Ir para exercício Supino reto/i }));
    expect(onJumpToExercise).toHaveBeenCalledWith('training-1', 'ex-1');
  });
});
