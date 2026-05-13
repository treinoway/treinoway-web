import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import DurationLabel from './DurationLabel';

describe('DurationLabel', () => {
  it('renders "Duração não estimada" for null seconds', () => {
    render(<DurationLabel seconds={null} />);
    expect(screen.getByText('Duração não estimada')).toBeInTheDocument();
  });

  it('renders "Treino rápido" for values under 5 minutes', () => {
    render(<DurationLabel seconds={120} />);
    expect(screen.getByText('Treino rápido')).toBeInTheDocument();
  });

  it('renders rounded minutes for an estimated duration', () => {
    render(<DurationLabel seconds={2580} />);
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('exposes a full-sentence aria-label, not just the abbreviated text', () => {
    render(<DurationLabel seconds={2580} />);
    expect(
      screen.getByLabelText('Duração estimada: 45 minutos'),
    ).toBeInTheDocument();
  });

  it('applies the variant class so layout can adapt', () => {
    const { container } = render(
      <DurationLabel seconds={2580} variant="column" />,
    );
    expect(
      container.querySelector('.duration-label--column'),
    ).toBeInTheDocument();
  });

  it('omits the icon in the bare variant', () => {
    const { container } = render(
      <DurationLabel seconds={2580} variant="bare" />,
    );
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
