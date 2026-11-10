import { render, screen, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import TeamSummaryCards from './TeamSummaryCards';

const SUMMARY = { teamAverage: 85.12, lastClosedWeekAverage: 84, fullLastWeek: 4, validLastWeek: 17, atRisk: 3, withSignal: 2 };
const COUNTS = { all: 19, risk: 3, signal: 2, entering: 1, paused: 1 };
const SEASON = { currentWeek: 3 };

// Renders the four cards with the example team of the design
const renderCards = (props = {}) =>
  render(<TeamSummaryCards summary={SUMMARY} counts={COUNTS} season={SEASON} onSelectFilter={vi.fn()} {...props} />);

// The card that carries the given label
const cardOf = (label) => screen.getByText(label).closest('.metric-card');

describe('TeamSummaryCards', () => {
  it('PAN-03 shows the four summary numbers', () => {
    renderCards();
    const average = cardOf('Constância média do time');
    expect(within(average).getByText('85%')).toBeInTheDocument();
    expect(within(average).getByText('Ao vivo, 19 alunos. Semana 2 fechou em 84%.')).toBeInTheDocument();
    const full = cardOf('Fecharam 100% na semana 2');
    expect(within(full).getByText('4 / 17')).toBeInTheDocument();
    expect(within(full).getByText('de 17 alunos com semana válida')).toBeInTheDocument();
    const risk = cardOf('Em risco');
    expect(within(risk).getByText('3')).toBeInTheDocument();
    expect(within(risk).getByText('Abaixo de 70% há 2 semanas seguidas')).toBeInTheDocument();
    const signals = cardOf('Sinais para revisar');
    expect(within(signals).getByText('2')).toBeInTheDocument();
    expect(within(signals).getByText('Não tiram ponto')).toBeInTheDocument();
    expect(within(signals).getByText('Conclusão rápida e registro em lote')).toBeInTheDocument();
  });

  it('PAN-14 activates the risk filter', async () => {
    const user = userEvent.setup();
    const onSelectFilter = vi.fn();
    renderCards({ onSelectFilter });
    await user.click(screen.getByRole('button', { name: 'Ver lista' }));
    expect(onSelectFilter).toHaveBeenCalledTimes(1);
    expect(onSelectFilter).toHaveBeenCalledWith('risk');
  });

  it('writes the configured risk rule in the risk card', () => {
    renderCards({ riskLimit: 60, riskWeeks: 3 });
    expect(screen.getByText('Abaixo de 60% há 3 semanas seguidas')).toBeInTheDocument();
  });

  it('shows dashes while no week has closed', () => {
    renderCards({ summary: { ...SUMMARY, teamAverage: null, lastClosedWeekAverage: null, fullLastWeek: 0, validLastWeek: 0 }, season: { currentWeek: 1 } });
    expect(within(cardOf('Constância média do time')).getByText('—')).toBeInTheDocument();
    expect(within(cardOf('Fecharam 100% na última semana')).getByText('—')).toBeInTheDocument();
  });
});
