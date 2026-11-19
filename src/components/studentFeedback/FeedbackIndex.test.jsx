import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import FeedbackIndex from './FeedbackIndex';

// Feedback with the fields the index reads; overrides replace any of them
const buildFeedback = (overrides = {}) => ({
  overallIndex: 63,
  band: 'stable',
  bandLabel: 'Estável',
  statusLabel: 'Respondido',
  ...overrides,
});

describe('FeedbackIndex', () => {
  it('shows the overall index next to the label of its band, not the status', () => {
    render(<FeedbackIndex feedback={buildFeedback()} />);

    expect(screen.getByText('63')).toBeInTheDocument();
    expect(screen.getByText('Estável')).toBeInTheDocument();
    expect(screen.queryByText('Respondido')).not.toBeInTheDocument();
  });

  it.each([
    ['attention', 'Atenção', 'badge--error'],
    ['stable', 'Estável', 'badge--warning'],
    ['good', 'Bom', 'badge--success'],
  ])('shows the %s band as a status badge with its tone', (band, bandLabel, toneClass) => {
    render(<FeedbackIndex feedback={buildFeedback({ band, bandLabel })} />);

    expect(screen.getByText(bandLabel)).toHaveClass('badge', 'badge--status', toneClass);
  });

  it('shows a band the app does not know with its label in a neutral badge', () => {
    render(<FeedbackIndex feedback={buildFeedback({ band: 'excellent', bandLabel: 'Excelente' })} />);

    expect(screen.getByText('Excelente')).toHaveClass('badge', 'badge--neutral');
    expect(screen.queryByText('Respondido')).not.toBeInTheDocument();
  });

  it('shows a dash and the status in a neutral badge when the feedback has no band', () => {
    render(<FeedbackIndex feedback={buildFeedback({ overallIndex: null, band: null, bandLabel: null, statusLabel: 'Expirado' })} />);

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('Expirado')).toHaveClass('badge', 'badge--status', 'badge--neutral');
  });

  it('shows an index of zero as "0", not as a dash', () => {
    render(<FeedbackIndex feedback={buildFeedback({ overallIndex: 0, band: 'attention', bandLabel: 'Atenção' })} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });
});
