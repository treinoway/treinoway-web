import { renderWithRoute, screen } from '../test/test-utils';
import PulseTooltip from './PulseTooltip';

const makeSession = (overrides = {}) => ({
  status: 'completed',
  volumeKg: 1200,
  hasLoad: true,
  sessionCount: 1,
  trainingName: 'Treino A',
  completedSets: 4,
  totalSets: 4,
  ...overrides,
});

const renderTooltip = (sessionOverrides = {}, props = {}) =>
  renderWithRoute(<PulseTooltip date="2026-04-30" session={makeSession(sessionOverrides)} {...props} />);

describe('PulseTooltip', () => {
  it('renders the formatted date with the weekday', () => {
    renderTooltip();
    expect(screen.getByText('Qui, 30 de abr')).toBeInTheDocument();
  });

  it.each([
    ['completed', 'Treino completo'],
    ['partial', 'Treino parcial'],
    ['abandoned', 'Treino abandonado'],
  ])('renders the %s status label', (status, label) => {
    renderTooltip({ status });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders the training name only when provided', () => {
    const { unmount } = renderTooltip();
    expect(screen.getByText('Treino A')).toBeInTheDocument();
    unmount();
    renderTooltip({ trainingName: null });
    expect(screen.queryByText('Treino')).not.toBeInTheDocument();
  });

  it('renders sets and the rounded volume', () => {
    renderTooltip({ volumeKg: 10029.4 });
    expect(screen.getByText('4/4')).toBeInTheDocument();
    expect(screen.getByText('10.029 kg')).toBeInTheDocument();
  });

  it('says "Sem carga registrada" for a session without load', () => {
    renderTooltip({ hasLoad: false, volumeKg: null });
    expect(screen.getByText('Sem carga registrada')).toBeInTheDocument();
  });

  it('shows the session count only for multi-session days', () => {
    const { unmount } = renderTooltip();
    expect(screen.queryByText('Sessões')).not.toBeInTheDocument();
    unmount();
    renderTooltip({ sessionCount: 2 });
    expect(screen.getByText('Sessões')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows an em-dash when no sets were logged', () => {
    renderTooltip({ completedSets: 0, totalSets: 0 });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('is a tooltip with the id the bar references', () => {
    renderTooltip({}, { id: 'tip-1', anchorDir: 'left' });
    expect(screen.getByRole('tooltip')).toHaveAttribute('id', 'tip-1');
  });
});
