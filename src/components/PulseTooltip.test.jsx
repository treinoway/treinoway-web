import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRoute } from '../test/test-utils';
import PulseTooltip from './PulseTooltip';

const defaultProps = {
  date: '2026-04-30',
  status: 'completed',
  trainingName: 'Treino A',
  volumeKg: 1200,
  completedSets: 4,
  totalSets: 4,
  anchorDir: 'center',
};

describe('PulseTooltip', () => {
  it('renders the formatted date', () => {
    renderWithRoute(<PulseTooltip {...defaultProps} />);
    // 2026-04-30 is a Thursday (Qui)
    expect(screen.getByText(/30 de abr/i)).toBeInTheDocument();
  });

  it('renders status label for completed', () => {
    renderWithRoute(<PulseTooltip {...defaultProps} status="completed" />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('renders status label for partial', () => {
    renderWithRoute(<PulseTooltip {...defaultProps} status="partial" />);
    expect(screen.getByText('Parcial')).toBeInTheDocument();
  });

  it('renders status label for abandoned', () => {
    renderWithRoute(<PulseTooltip {...defaultProps} status="abandoned" />);
    expect(screen.getByText('Abandonado')).toBeInTheDocument();
  });

  it('renders status label for empty', () => {
    renderWithRoute(
      <PulseTooltip {...defaultProps} status="empty" trainingName={null} volumeKg={null} />,
    );
    expect(screen.getByText('Sem treino')).toBeInTheDocument();
  });

  it('renders training name when provided', () => {
    renderWithRoute(<PulseTooltip {...defaultProps} />);
    expect(screen.getByText('Treino A')).toBeInTheDocument();
  });

  it('does not render training name row when null', () => {
    renderWithRoute(<PulseTooltip {...defaultProps} trainingName={null} />);
    expect(screen.queryByText('Treino')).not.toBeInTheDocument();
  });

  it('renders volume and sets for non-empty status', () => {
    renderWithRoute(<PulseTooltip {...defaultProps} />);
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('Séries')).toBeInTheDocument();
    expect(screen.getByText('4/4')).toBeInTheDocument();
  });

  it('hides volume and sets for empty status', () => {
    renderWithRoute(
      <PulseTooltip {...defaultProps} status="empty" trainingName={null} volumeKg={null} />,
    );
    expect(screen.queryByText('Volume')).not.toBeInTheDocument();
    expect(screen.queryByText('Séries')).not.toBeInTheDocument();
  });

  it('shows em-dash for null volumeKg', () => {
    renderWithRoute(<PulseTooltip {...defaultProps} volumeKg={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('applies left-anchored class when anchorDir is left', () => {
    const { container } = renderWithRoute(
      <PulseTooltip {...defaultProps} anchorDir="left" />,
    );
    expect(container.querySelector('.pulse-tooltip--left-anchored')).toBeInTheDocument();
  });

  it('applies right-anchored class when anchorDir is right', () => {
    const { container } = renderWithRoute(
      <PulseTooltip {...defaultProps} anchorDir="right" />,
    );
    expect(container.querySelector('.pulse-tooltip--right-anchored')).toBeInTheDocument();
  });

  it('applies no anchor class when anchorDir is center', () => {
    const { container } = renderWithRoute(
      <PulseTooltip {...defaultProps} anchorDir="center" />,
    );
    expect(container.querySelector('.pulse-tooltip--left-anchored')).not.toBeInTheDocument();
    expect(container.querySelector('.pulse-tooltip--right-anchored')).not.toBeInTheDocument();
  });

  it('has role tooltip for accessibility', () => {
    renderWithRoute(<PulseTooltip {...defaultProps} />);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});
