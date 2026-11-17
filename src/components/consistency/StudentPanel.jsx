import { useState } from 'react';
import PropTypes from 'prop-types';
import { Info, Pause, Target } from 'lucide-react';
import Avatar from '../ds/Avatar';
import Badge from '../ds/Badge';
import Banner from '../ds/Banner';
import Drawer from '../ds/Drawer';
import AdjustTargetModal from './AdjustTargetModal';
import FaixaBadge from './FaixaBadge';
import PauseWeekModal from './PauseWeekModal';
import PillarProgressList from './PillarProgressList';
import ReadyMessageCard from './ReadyMessageCard';
import WeekHistoryChart from './WeekHistoryChart';
import useConsistencyStudentPanel from '../../hooks/useConsistencyStudentPanel';
import useMediaQuery from '../../hooks/useMediaQuery';
import { formatScore } from '../../utils/consistencyFormat';
import { FAIXA_LABELS } from '../../constants/consistencyRanking';

const SIDE_PANEL_QUERY = '(min-width: 768px)';
const DEFAULT_RISK_LIMIT = 70;
const WEEK_STATE_CURRENT = 'current';
const NO_VALUE = '—';
const ACTIONS_NOTE = 'Pausar deixa a semana neutra: não entra na média e não quebra a sequência. Ajustar a meta vale só para esta semana.';

// "64% e 58%" or "64%, 58% e 51%"
const scoresText = (scores) => {
  const labels = scores.map(formatScore);
  if (labels.length < 2) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
};

// "17º de 18 · 61% na temporada", leaving out the parts the student does not have yet
const standingText = ({ position, total, average }) =>
  [position ? `${position}º de ${total}` : null, average === null || average === undefined ? null : `${formatScore(average)} na temporada`]
    .filter(Boolean)
    .join(' · ');

// Subtitle under the name: standing and season band
const PanelSubtitle = ({ data }) => (
  <span className="student-panel__subtitle type-caption">
    {standingText(data)}
    <FaixaBadge faixa={data.faixa} />
  </span>
);

PanelSubtitle.propTypes = {
  data: PropTypes.shape({ position: PropTypes.number, total: PropTypes.number, average: PropTypes.number, faixa: PropTypes.string }).isRequired,
};

// Alert with the weeks that put the student at risk
const RiskAlert = ({ risk, riskLimit }) => (
  <Banner tone="error">{`Abaixo de ${riskLimit}% há ${risk.weeks} ${risk.weeks === 1 ? 'semana seguida' : 'semanas seguidas'}: ${scoresText(risk.scores)}.`}</Banner>
);

RiskAlert.propTypes = {
  risk: PropTypes.shape({ weeks: PropTypes.number, scores: PropTypes.arrayOf(PropTypes.number) }).isRequired,
  riskLimit: PropTypes.number.isRequired,
};

// "Semana pausada (motivo)" with the action that makes the week count again
const PausedWeek = ({ pause, onResume }) => (
  <div className="student-panel__paused">
    <Badge tone="neutral">{pause.reason ? `Semana pausada (${pause.reason})` : 'Semana pausada'}</Badge>
    <button type="button" className="btn btn--secondary" onClick={onResume}>Desfazer pausa</button>
  </div>
);

PausedWeek.propTypes = {
  pause: PropTypes.shape({ weekStart: PropTypes.string, reason: PropTypes.string }).isRequired,
  onResume: PropTypes.func.isRequired,
};

// Pause and adjust actions of the running week with the note that explains them
const WeekActions = ({ pause, onPause, onAdjust, onResume }) => (
  <section className="student-panel__section" aria-label="Ações na semana atual">
    <h3 className="type-overline student-panel__section-title">Ações na semana atual</h3>
    {pause ? (
      <PausedWeek pause={pause} onResume={onResume} />
    ) : (
      <div className="ds-actions student-panel__actions">
        <button type="button" className="btn btn--secondary" onClick={onPause}>
          <Pause size={16} strokeWidth={2} aria-hidden="true" />
          Pausar semana
        </button>
        <button type="button" className="btn btn--secondary" onClick={onAdjust}>
          <Target size={16} strokeWidth={2} aria-hidden="true" />
          Ajustar meta
        </button>
      </div>
    )}
    <p className="student-panel__note type-caption">
      <Info size={16} strokeWidth={2} aria-hidden="true" />
      {ACTIONS_NOTE}
    </p>
  </section>
);

WeekActions.propTypes = {
  pause: PropTypes.shape({ weekStart: PropTypes.string, reason: PropTypes.string }),
  onPause: PropTypes.func.isRequired,
  onAdjust: PropTypes.func.isRequired,
  onResume: PropTypes.func.isRequired,
};

// "05/11/2026" of the last contact, a dash when there was none
const lastContactText = (lastContact) => (lastContact ? new Date(lastContact).toLocaleDateString('pt-BR') : NO_VALUE);

// Average and band of each previous season and the date of the last contact
const PanelFooter = ({ previousSeasons, lastContact }) => (
  <p className="student-panel__footer type-caption">
    {previousSeasons.map((season) => (
      <span key={season.number}>{`Temporada ${season.number}: ${formatScore(season.average)} · ${FAIXA_LABELS[season.faixa]}`}</span>
    ))}
    <span>{`Último contato: ${lastContactText(lastContact)}`}</span>
  </p>
);

PanelFooter.propTypes = {
  previousSeasons: PropTypes.arrayOf(PropTypes.shape({ number: PropTypes.number, average: PropTypes.number, faixa: PropTypes.string })).isRequired,
  lastContact: PropTypes.string,
};

// Content of a loaded panel: alert, chart, pillars, ready message, actions and footer; the modals of the actions open over it
const PanelContent = ({ data, panel, seasonNumber, closeLabel, onChanged }) => {
  const [modal, setModal] = useState(null);
  const currentWeek = data.weeks.find((week) => week.state === WEEK_STATE_CURRENT);
  const closeModal = () => setModal(null);
  const afterChange = (action) => async (...args) => {
    await action(...args);
    onChanged?.();
  };

  return (
    <div className="student-panel__content">
      {data.risk && <RiskAlert risk={data.risk} riskLimit={data.riskLimit ?? DEFAULT_RISK_LIMIT} />}
      <WeekHistoryChart weeks={data.weeks} riskLimit={data.riskLimit ?? DEFAULT_RISK_LIMIT} seasonNumber={seasonNumber} closeLabel={closeLabel} />
      <PillarProgressList pillars={data.seasonPillars} />
      <ReadyMessageCard firstName={data.firstName} pillar={data.weakestPillar} whatsapp={data.whatsapp} onContact={afterChange(panel.logContact)} />
      {currentWeek && (
        <WeekActions
          pause={data.pause}
          onPause={() => setModal('pause')}
          onAdjust={() => setModal('adjust')}
          onResume={afterChange(() => panel.resumeWeek(data.pause.weekStart))}
        />
      )}
      <PanelFooter previousSeasons={data.previousSeasons ?? []} lastContact={data.lastContact} />
      {modal === 'pause' && (
        <PauseWeekModal currentWeekStart={currentWeek.weekStart} studentName={data.displayName} onSubmit={afterChange(panel.pauseWeek)} onClose={closeModal} />
      )}
      {modal === 'adjust' && <AdjustTargetModal targets={data.currentTargets} studentName={data.displayName} onSubmit={afterChange(panel.adjustTarget)} onClose={closeModal} />}
    </div>
  );
};

PanelContent.propTypes = {
  data: PropTypes.object.isRequired,
  panel: PropTypes.object.isRequired,
  seasonNumber: PropTypes.number,
  closeLabel: PropTypes.string,
  onChanged: PropTypes.func,
};

// Body of the drawer: loading, error with retry, or the panel
const PanelBody = ({ panel, ...contentProps }) => {
  if (panel.error) return <Banner tone="error" action={<button type="button" className="btn btn--secondary" onClick={panel.reload}>Tentar de novo</button>}>{panel.error}</Banner>;
  if (panel.loading || !panel.data) return <div className="loading-screen loading-screen--inline">Carregando...</div>;
  return <PanelContent data={panel.data} panel={panel} {...contentProps} />;
};

PanelBody.propTypes = {
  panel: PropTypes.object.isRequired,
};

// Side panel of a student: risk alert, week-by-week chart, season pillars, ready WhatsApp message, pause and target actions and history; full screen below 768px
const StudentPanel = ({ studentId, studentName, seasonNumber, closeLabel, onClose, onChanged }) => {
  const panel = useConsistencyStudentPanel(studentId);
  const isWide = useMediaQuery(SIDE_PANEL_QUERY);
  const { data } = panel;
  const title = data?.displayName ?? studentName ?? '';

  return (
    <Drawer
      title={title}
      leading={<span className={data?.risk ? 'student-panel__avatar student-panel__avatar--risk' : 'student-panel__avatar'}><Avatar name={title} size="lg" /></span>}
      subtitle={data ? <PanelSubtitle data={data} /> : null}
      layout={isWide ? 'side' : 'fullscreen'}
      width="wide"
      onClose={onClose}
    >
      <PanelBody panel={panel} seasonNumber={seasonNumber} closeLabel={closeLabel} onChanged={onChanged} />
    </Drawer>
  );
};

StudentPanel.propTypes = {
  studentId: PropTypes.string.isRequired,
  studentName: PropTypes.string,
  seasonNumber: PropTypes.number,
  closeLabel: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func,
};

export default StudentPanel;
