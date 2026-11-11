import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pause, Settings2, Users } from 'lucide-react';
import api from '../../api/axios';
import Banner from '../../components/ds/Banner';
import EmptyBlock from '../../components/ds/EmptyBlock';
import SkeletonRows from '../../components/ds/SkeletonRows';
import HistoryGeneralTable from '../../components/consistency/HistoryGeneralTable';
import PauseWeekModal from '../../components/consistency/PauseWeekModal';
import PreviousSeasonsList from '../../components/consistency/PreviousSeasonsList';
import SeasonHeaderCard from '../../components/consistency/SeasonHeaderCard';
import StandingsTable from '../../components/consistency/StandingsTable';
import StandingsToolbar from '../../components/consistency/StandingsToolbar';
import StudentPanel from '../../components/consistency/StudentPanel';
import TeamSummaryCards from '../../components/consistency/TeamSummaryCards';
import useConsistencyConfig from '../../hooks/useConsistencyConfig';
import useConsistencyStandings from '../../hooks/useConsistencyStandings';
import { currentWeekStartOf, formatCloseLabel, formatNotStartedMessage } from '../../utils/consistencyFormat';
import { SEASON_STATUS, STANDINGS_FILTER, STANDINGS_TAB } from '../../constants/consistencyRanking';

const PAUSES_URL = '/trainer/consistency-ranking/pauses';
const SETTINGS_PATH = '/trainer/consistency-ranking/settings';
const SUMMARY_SKELETON_COUNT = 4;
const TABLE_SKELETON_COUNT = 8;

// Whether the loaded payload is the one the active tab shows (the data of the previous tab stays until the next one arrives)
const dataMatchesTab = (data, tab) => {
  if (!data) return false;
  if (tab === STANDINGS_TAB.CURRENT) return 'season' in data;
  if (tab === STANDINGS_TAB.SEASONS) return 'seasons' in data;
  return Array.isArray(data.rows) && !('season' in data);
};

// "domingo às 21h" of the running season close, or undefined once the season is closed
const closeLabelOf = (season, timeZone) =>
  season.status === SEASON_STATUS.ACTIVE && season.closesAt ? formatCloseLabel(season.closesAt, timeZone) : undefined;

// Title, subtitle and the team-level actions of the page
const PageHeader = ({ canPause, onPauseTeam, onConfigure }) => (
  <header className="ds-page-header">
    <div className="consistency-page__heading">
      <span className="type-overline">Alunos</span>
      <h1 className="ds-page-header__title type-h1">Ranking de Constância</h1>
      <p className="type-body consistency-page__subtitle">Quem está cumprindo o combinado, semana a semana. Treino extra não pontua.</p>
    </div>
    <div className="ds-page-header__actions">
      <button type="button" className="btn btn--secondary" disabled={!canPause} onClick={onPauseTeam}>
        <Pause size={16} strokeWidth={2} aria-hidden="true" />
        Pausar semana do time
      </button>
      <button type="button" className="btn btn--primary" onClick={onConfigure}>
        <Settings2 size={16} strokeWidth={2} aria-hidden="true" />
        Configurar ranking
      </button>
    </div>
  </header>
);

PageHeader.propTypes = {
  canPause: PropTypes.bool.isRequired,
  onPauseTeam: PropTypes.func.isRequired,
  onConfigure: PropTypes.func.isRequired,
};

// Placeholder of the summary cards and the table while the first standings load
const RankingSkeleton = () => (
  <>
    <div className="metric-grid" aria-hidden="true">
      {Array.from({ length: SUMMARY_SKELETON_COUNT }, (_, index) => (
        <div key={index} className="row-skeleton" />
      ))}
    </div>
    <section className="section-card">
      <SkeletonRows label="Carregando classificação" count={TABLE_SKELETON_COUNT} />
    </section>
  </>
);

// Body of the tab chosen on the toolbar: standings table, general history or previous seasons
const TabContent = ({ standings, riskLimit, timeZone, actions }) => {
  const { data, tab } = standings;
  if (!dataMatchesTab(data, tab)) return <SkeletonRows label="Carregando classificação" count={TABLE_SKELETON_COUNT} />;
  if (tab === STANDINGS_TAB.HISTORY) return <HistoryGeneralTable rows={data.rows} />;
  if (tab === STANDINGS_TAB.SEASONS) return <PreviousSeasonsList seasons={data.seasons} onOpenSeason={actions.onOpenSeason} />;
  return (
    <StandingsTable
      rows={data.rows}
      entering={data.entering ?? []}
      season={data.season}
      riskLimit={riskLimit}
      timeZone={timeZone}
      onOpenStudent={actions.onOpenStudent}
      onMessage={actions.onOpenStudent}
      onPause={actions.onPauseStudent}
      onClearFilters={actions.onClearFilters}
    />
  );
};

TabContent.propTypes = {
  standings: PropTypes.object.isRequired,
  riskLimit: PropTypes.number,
  timeZone: PropTypes.string,
  actions: PropTypes.object.isRequired,
};

// Season header and summary cards of the current season tab
const SeasonOverview = ({ data, config, onSelectFilter }) => (
  <>
    <SeasonHeaderCard season={data.season} timeZone={config?.timeZone} />
    {data.summary && data.counts && (
      <TeamSummaryCards
        summary={data.summary}
        counts={data.counts}
        season={data.season}
        riskLimit={config?.riskLimit}
        riskWeeks={config?.riskWeeks}
        onSelectFilter={onSelectFilter}
      />
    )}
  </>
);

SeasonOverview.propTypes = {
  data: PropTypes.object.isRequired,
  config: PropTypes.object,
  onSelectFilter: PropTypes.func.isRequired,
};

// Toolbar and tab content in one card
const RankingBoard = ({ standings, config, actions }) => (
  <section className="section-card consistency-board">
    <StandingsToolbar
      tab={standings.tab}
      onTabChange={actions.onTabChange}
      filter={standings.filter}
      onFilterChange={standings.setFilter}
      query={standings.query}
      onQueryChange={standings.setQuery}
      counts={standings.data.counts ?? {}}
      live={standings.data.season?.status !== SEASON_STATUS.CLOSED}
    />
    <TabContent standings={standings} riskLimit={config?.riskLimit} timeZone={config?.timeZone} actions={actions} />
  </section>
);

RankingBoard.propTypes = {
  standings: PropTypes.object.isRequired,
  config: PropTypes.object,
  actions: PropTypes.object.isRequired,
};

// Everything under the header: error, loading, the not-started or no-student state, or the season, cards and board
const RankingContent = ({ standings, config, actions }) => {
  const { data, error, tab, reload } = standings;
  const isCurrent = tab === STANDINGS_TAB.CURRENT;
  const showOverview = isCurrent && dataMatchesTab(data, tab);
  const isNotStarted = showOverview && !data.season;
  const isEmptyTeam = showOverview && (isNotStarted || data.counts?.all === 0);
  const emptyMessage = formatNotStartedMessage(isNotStarted ? data.notStarted : null);
  const retry = <button type="button" className="btn btn--secondary" onClick={reload}>Tentar de novo</button>;

  return (
    <>
      {error && <Banner tone="error" action={retry}>{error}</Banner>}
      {!data && !error && <RankingSkeleton />}
      {showOverview && data.season && <SeasonOverview data={data} config={config} onSelectFilter={standings.setFilter} />}
      {isEmptyTeam && <EmptyBlock icon={Users} title={emptyMessage} />}
      {data && !isEmptyTeam && <RankingBoard standings={standings} config={config} actions={actions} />}
    </>
  );
};

RankingContent.propTypes = {
  standings: PropTypes.object.isRequired,
  config: PropTypes.object,
  actions: PropTypes.object.isRequired,
};

// Ranking of the trainer's team: season, summary, filters, standings, student panel and pauses
const ConsistencyRanking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const standings = useConsistencyStandings();
  const { config } = useConsistencyConfig();
  const [openStudent, setOpenStudent] = useState(null);
  const [pauseTarget, setPauseTarget] = useState(null);
  const { setSeasonNumber, setTab, setFilter, setQuery, reload, data } = standings;
  const season = data?.season;

  useEffect(() => {
    const requested = Number(searchParams.get('season'));
    if (requested) setSeasonNumber(requested);
  }, [searchParams, setSeasonNumber]);

  const handleTabChange = (next) => {
    if (next === STANDINGS_TAB.CURRENT) setSeasonNumber(null);
    setTab(next);
  };

  const handleOpenSeason = (number) => {
    setSeasonNumber(number);
    setTab(STANDINGS_TAB.CURRENT);
  };

  const handleClearFilters = () => {
    setFilter(STANDINGS_FILTER.ALL);
    setQuery('');
  };

  const handlePause = async ({ weekStart, reason }) => {
    const body = pauseTarget.studentId ? { weekStart, studentId: pauseTarget.studentId, reason } : { weekStart, reason };
    await api.post(PAUSES_URL, body);
    await reload();
  };

  const actions = {
    onTabChange: handleTabChange,
    onOpenSeason: handleOpenSeason,
    onClearFilters: handleClearFilters,
    onOpenStudent: (row) => setOpenStudent({ studentId: row.studentId, name: row.displayName }),
    onPauseStudent: (row) => setPauseTarget({ scope: 'student', studentId: row.studentId, name: row.displayName }),
  };

  return (
    <div className="consistency-page">
      <PageHeader canPause={season?.status === SEASON_STATUS.ACTIVE} onPauseTeam={() => setPauseTarget({ scope: 'team' })} onConfigure={() => navigate(SETTINGS_PATH)} />
      <RankingContent standings={standings} config={config} actions={actions} />
      {openStudent && season && (
        <StudentPanel
          studentId={openStudent.studentId}
          studentName={openStudent.name}
          seasonNumber={season.number}
          closeLabel={closeLabelOf(season, config?.timeZone)}
          onClose={() => setOpenStudent(null)}
          onChanged={reload}
        />
      )}
      {pauseTarget && season && (
        <PauseWeekModal
          currentWeekStart={currentWeekStartOf(season)}
          scope={pauseTarget.scope}
          studentName={pauseTarget.name}
          onSubmit={handlePause}
          onClose={() => setPauseTarget(null)}
        />
      )}
    </div>
  );
};

export default ConsistencyRanking;
