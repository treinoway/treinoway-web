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

  it('PAN-48 names the quick completions with the threshold of the signal', () => {
    const quick = { ...QUICK, thresholdMinutes: 10 };
    const { rerender } = render(<StudentSignals row={{ pause: null, signals: [quick, { ...quick, sessionId: 's2' }], risk: null, entering: null }} season={SEASON} />);
    expect(screen.getByText('2 treinos em menos de 10 min')).toHaveClass('badge--warning');

    rerender(<StudentSignals row={{ pause: null, signals: [quick], risk: null, entering: null }} season={SEASON} />);
    expect(screen.getByText('1 treino em menos de 10 min')).toBeInTheDocument();
  });

  it('PAN-49 names the batch logging with the weekday and time of its last session in the close time zone', () => {
    const batch = { type: 'batch_logging', count: 5, windowMinutes: 30, lastFinishedAt: '2026-11-08T23:48:00.000Z' };
    render(<StudentSignals row={{ pause: null, signals: [batch], risk: null, entering: null }} season={SEASON} timeZone="America/Sao_Paulo" />);

    expect(screen.getByText('Registro em lote no domingo 20h48')).toBeInTheDocument();
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
