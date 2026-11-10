import PropTypes from 'prop-types';
import MetricCard from '../ds/MetricCard';
import Badge from '../ds/Badge';
import { formatScore } from '../../utils/consistencyFormat';
import { STANDINGS_FILTER } from '../../constants/consistencyRanking';

const DEFAULT_RISK_LIMIT = 70;
const DEFAULT_RISK_WEEKS = 2;

// "Ao vivo, N alunos." plus how the last closed week ended, when there is one
const averageSupportOf = ({ summary, counts, season }) => {
  const live = `Ao vivo, ${counts.all} alunos.`;
  if (summary.lastClosedWeekAverage === null || summary.lastClosedWeekAverage === undefined) return live;
  return `${live} Semana ${season.currentWeek - 1} fechou em ${formatScore(summary.lastClosedWeekAverage)}.`;
};

// Label, value and support of the "closed at 100%" card
const fullCardOf = ({ summary, season }) => {
  const closedWeek = season.currentWeek - 1;
  const hasClosedWeek = closedWeek >= 1 && summary.validLastWeek > 0;
  return {
    label: closedWeek >= 1 ? `Fecharam 100% na semana ${closedWeek}` : 'Fecharam 100% na última semana',
    value: hasClosedWeek ? `${summary.fullLastWeek} / ${summary.validLastWeek}` : '—',
    support: hasClosedWeek ? `de ${summary.validLastWeek} alunos com semana válida` : undefined,
  };
};

// Four summary cards of the team; "Ver lista" asks the page to filter the students at risk
const TeamSummaryCards = ({ summary, counts, season, onSelectFilter, riskLimit = DEFAULT_RISK_LIMIT, riskWeeks = DEFAULT_RISK_WEEKS }) => {
  const full = fullCardOf({ summary, season });
  return (
    <section className="metric-grid" aria-label="Resumo do time">
      <MetricCard
        label="Constância média do time"
        value={formatScore(summary.teamAverage)}
        support={averageSupportOf({ summary, counts, season })}
        tone="brand"
      />
      <MetricCard label={full.label} value={full.value} support={full.support} />
      <MetricCard
        label="Em risco"
        value={summary.atRisk}
        support={`Abaixo de ${riskLimit}% há ${riskWeeks} semanas seguidas`}
        tone={summary.atRisk > 0 ? 'error' : 'neutral'}
        action={
          <button type="button" className="btn btn--ghost" onClick={() => onSelectFilter(STANDINGS_FILTER.RISK)}>
            Ver lista
          </button>
        }
      />
      <MetricCard
        label="Sinais para revisar"
        value={summary.withSignal}
        support="Conclusão rápida e registro em lote"
        tone={summary.withSignal > 0 ? 'warning' : 'neutral'}
        action={<Badge variant="tag" tone="warning">Não tiram ponto</Badge>}
      />
    </section>
  );
};

TeamSummaryCards.propTypes = {
  summary: PropTypes.shape({
    teamAverage: PropTypes.number,
    lastClosedWeekAverage: PropTypes.number,
    fullLastWeek: PropTypes.number,
    validLastWeek: PropTypes.number,
    atRisk: PropTypes.number,
    withSignal: PropTypes.number,
  }).isRequired,
  counts: PropTypes.shape({ all: PropTypes.number }).isRequired,
  season: PropTypes.shape({ currentWeek: PropTypes.number }).isRequired,
  onSelectFilter: PropTypes.func.isRequired,
  riskLimit: PropTypes.number,
  riskWeeks: PropTypes.number,
};

export default TeamSummaryCards;
