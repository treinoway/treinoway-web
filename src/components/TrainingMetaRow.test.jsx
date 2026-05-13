import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import TrainingMetaRow from './TrainingMetaRow';

describe('TrainingMetaRow', () => {
  it('renders duration, count and category in the student-card variant', () => {
    render(
      <TrainingMetaRow
        estimatedDurationSeconds={2700}
        exerciseCount={8}
        categoryLabel="Força"
      />,
    );
    expect(screen.getByText('45 min')).toBeInTheDocument();
    expect(screen.getByText('8 exercícios')).toBeInTheDocument();
    expect(screen.getByText('Força')).toBeInTheDocument();
  });

  it('uses singular "exercício" when count is 1', () => {
    render(<TrainingMetaRow exerciseCount={1} categoryLabel="Mobilidade" />);
    expect(screen.getByText('1 exercício')).toBeInTheDocument();
  });

  it('renders "Duração não estimada" when seconds is null', () => {
    render(
      <TrainingMetaRow
        estimatedDurationSeconds={null}
        exerciseCount={8}
        categoryLabel="Força"
      />,
    );
    expect(screen.getByText('Duração não estimada')).toBeInTheDocument();
  });

  it('omits the category segment when categoryLabel is empty', () => {
    render(
      <TrainingMetaRow
        estimatedDurationSeconds={300}
        exerciseCount={4}
        categoryLabel=""
      />,
    );
    expect(screen.queryByText('Força')).not.toBeInTheDocument();
  });

  it('renders the trainer-row variant with duration aligned to the right column', () => {
    const { container } = render(
      <TrainingMetaRow
        estimatedDurationSeconds={2700}
        exerciseCount={8}
        categoryLabel="Força"
        variant="trainer-row"
      />,
    );
    expect(
      container.querySelector('.training-meta-row--trainer-row'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('.training-meta-row__primary'),
    ).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });
});
