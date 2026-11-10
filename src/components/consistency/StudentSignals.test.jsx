import { render, screen } from '../../test/test-utils';
import StudentSignals from './StudentSignals';

const SEASON = { number: 3, startWeek: '2026-10-19', weeks: 4, currentWeek: 3 };
const QUICK = { type: 'quick_completion', sessionId: 's1', durationSeconds: 240 };
const BATCH = { type: 'batch_logging', count: 5 };

describe('StudentSignals', () => {
  it('PAN-08 renders pause, signal, risk and entering badges', () => {
    const row = {
      pause: { weekStart: '2026-11-02', reason: 'viagem' },
      signals: [QUICK, BATCH],
      risk: { weeks: 2, scores: [64, 58] },
      entering: { validWeeks: 1, required: 2 },
    };
    render(<StudentSignals row={row} season={SEASON} />);
    expect(screen.getByText('Semana 3 pausada (viagem)')).toHaveClass('badge--neutral');
    expect(screen.getByText('Conclusão rápida')).toHaveClass('badge--warning');
    expect(screen.getByText('Registro em lote')).toHaveClass('badge--warning');
    expect(screen.getByText('2 semanas abaixo de 70%')).toHaveClass('badge--error');
    expect(screen.getByText('Entrando na temporada · 1 de 2 semanas')).toBeInTheDocument();
  });

  it('PAN-08 shows the badge of a closed paused week when the running week is not paused', () => {
    render(<StudentSignals row={{ pause: null, closedPause: { weekStart: '2026-10-26', reason: 'viagem' }, signals: [], risk: null, entering: null }} season={SEASON} />);

    expect(screen.getByText('Semana 2 pausada (viagem)')).toBeInTheDocument();
  });

  it('prefers the pause of the running week over a closed one', () => {
    const row = { pause: { weekStart: '2026-11-09', reason: 'gripe' }, closedPause: { weekStart: '2026-10-26', reason: 'viagem' }, signals: [], risk: null, entering: null };
    render(<StudentSignals row={row} season={SEASON} />);

    expect(screen.getByText('Semana 4 pausada (gripe)')).toBeInTheDocument();
    expect(screen.queryByText(/viagem/)).not.toBeInTheDocument();
  });

  it('names the pause week without a reason in parentheses when none was given', () => {
    render(<StudentSignals row={{ pause: { weekStart: '2026-10-26', reason: null }, signals: [], risk: null, entering: null }} season={SEASON} />);
    expect(screen.getByText('Semana 2 pausada')).toBeInTheDocument();
  });

  it('counts several quick completions in one badge', () => {
    render(<StudentSignals row={{ pause: null, signals: [QUICK, { ...QUICK, sessionId: 's2' }], risk: null, entering: null }} season={SEASON} />);
    expect(screen.getByText('2 conclusões rápidas')).toBeInTheDocument();
  });

  it('writes the configured risk limit and a singular week', () => {
    render(<StudentSignals row={{ pause: null, signals: [], risk: { weeks: 1, scores: [50] }, entering: null }} season={SEASON} riskLimit={60} />);
    expect(screen.getByText('1 semana abaixo de 60%')).toBeInTheDocument();
  });

  it('renders nothing for a student with no flags', () => {
    const { container } = render(<StudentSignals row={{ pause: null, signals: [], risk: null, entering: null }} season={SEASON} />);
    expect(container).toBeEmptyDOMElement();
  });
});
