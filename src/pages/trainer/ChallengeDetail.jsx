import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Ban, Lock, Trophy } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import EmptyBlock from '../../components/ds/EmptyBlock';
import SkeletonRows from '../../components/ds/SkeletonRows';
import Tabs from '../../components/ds/Tabs';
import StudentBonusSheet from '../../components/StudentBonusSheet';
import ChallengePageHeader, { BackToChallenges, ChallengeLoadingHeader } from '../../components/challenge/ChallengePageHeader';
import ChallengeSettingsTab from '../../components/challenge/ChallengeSettingsTab';
import ConsistencyRankingTab from '../../components/challenge/ConsistencyRankingTab';
import ParticipantsTab from '../../components/challenge/ParticipantsTab';
import PointsRankingTab from '../../components/challenge/PointsRankingTab';
import StudentPanel from '../../components/consistency/StudentPanel';
import useChallengeConsistency from '../../hooks/useChallengeConsistency';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useConsistencyRankingAccess from '../../hooks/useConsistencyRankingAccess';
import useWeeklyChampionshipSources from '../../hooks/useWeeklyChampionshipSources';
import { todayIn } from '../../utils/challengeDisplay';
import { dayMonthOf, formatCloseLabel } from '../../utils/consistencyFormat';
import { CHALLENGE_FORMAT, CHALLENGE_STATUS } from '../../constants/challenge';

const LIST_PATH = '/trainer/challenges';
const DISCARD_MESSAGE = 'Há mudanças não salvas. Descartar e sair?';
const LOADING_ROWS = 6;
const TAB = Object.freeze({ RANKING: 'ranking', POINTS: 'points', PARTICIPANTS: 'participants', SETTINGS: 'settings' });
const LEGACY_TABS = Object.freeze({ config: TAB.SETTINGS, standings: TAB.RANKING });
const WEEKLY_TABS = Object.freeze([
  { id: TAB.RANKING, label: 'Ranking' },
  { id: TAB.POINTS, label: 'Pontos' },
  { id: TAB.PARTICIPANTS, label: 'Participantes' },
  { id: TAB.SETTINGS, label: 'Configurações' },
]);
const DATES_TABS = Object.freeze(WEEKLY_TABS.filter((tab) => tab.id !== TAB.POINTS));
const READ_ONLY_STATUSES = Object.freeze([CHALLENGE_STATUS.COMPLETED, CHALLENGE_STATUS.CANCELLED]);

// Full name of a participant, ranking entry or standings row
const fullNameOf = (person) => `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.name || 'Aluno';

// Tab asked by ?tab=, mapping the F2.5 names
const requestedTabOf = (searchParams) => {
  const asked = searchParams.get('tab');
  return LEGACY_TABS[asked] ?? asked;
};

// Statuses of a read that mean the championship is not the trainer's to see: unknown (404) or another trainer's (403)
const NOT_FOUND_STATUSES = Object.freeze([403, 404]);

// Championship of the page: loading, ready or not found (any failed first read); reload reads it again
const useChallengeResource = (id) => {
  const { showToast } = useToast();
  const [state, setState] = useState({ status: 'loading', challenge: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    api.get(`/trainer/challenges/${id}`)
      .then(({ data }) => { if (active) setState({ status: 'ready', challenge: data }); })
      .catch((error) => {
        if (!active) return;
        if (!NOT_FOUND_STATUSES.includes(error.response?.status)) showToast(error.userMessage || translateError(error), 'error');
        setState((current) => (current.challenge ? current : { status: 'notFound', challenge: null }));
      });
    return () => { active = false; };
  }, [id, version, showToast]);
  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const setChallenge = useCallback((challenge) => setState({ status: 'ready', challenge }), []);
  return { ...state, reload, setChallenge };
};

// List read from the API while enabled and again on reload; loading until its first read lands, a failure becomes a toast unless quiet
const useListResource = (url, enabled, { quiet = false } = {}) => {
  const { showToast } = useToast();
  const [state, setState] = useState({ items: [], loadedUrl: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    api.get(url)
      .then(({ data }) => { if (active) setState({ items: data || [], loadedUrl: url }); })
      .catch((error) => {
        if (!active) return;
        if (!quiet) showToast(error.userMessage || translateError(error), 'error');
        setState((current) => ({ ...current, loadedUrl: url }));
      });
    return () => { active = false; };
  }, [url, enabled, version, quiet, showToast]);
  const reload = useCallback(() => setVersion((current) => current + 1), []);
  return { items: state.items, loading: enabled && state.loadedUrl !== url, reload };
};

// Tab shown, kept in ?tab=, falling back to Ranking when the format has no such tab
const useDetailTab = (tabs) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const asked = requestedTabOf(searchParams);
  const tab = tabs.some((item) => item.id === asked) ? asked : TAB.RANKING;
  const setTab = useCallback((next) => setSearchParams({ tab: next }, { replace: true }), [setSearchParams]);
  return [tab, setTab];
};

// Everything the tabs read: the championship, its consistency standings, XP ranking, participants and students
const useChallengeDetailData = (id, weeklyAccess) => {
  const resource = useChallengeResource(id);
  const { challenge } = resource;
  const isWeekly = weeklyAccess && challenge?.format === CHALLENGE_FORMAT.WEEKS;
  const [tab, setTab] = useDetailTab(isWeekly ? WEEKLY_TABS : DATES_TABS);
  const ready = resource.status === 'ready';
  const cancelled = challenge?.status === CHALLENGE_STATUS.CANCELLED;
  const consistency = useChallengeConsistency(id, { enabled: isWeekly && !cancelled && (tab === TAB.RANKING || tab === TAB.SETTINGS) });
  const needsRanking = ready && (tab === TAB.PARTICIPANTS || tab === (isWeekly ? TAB.POINTS : TAB.RANKING));
  const ranking = useListResource(`/trainer/challenges/${id}/ranking`, needsRanking);
  const participants = useListResource(`/trainer/challenges/${id}/participants`, ready && tab === TAB.PARTICIPANTS);
  const students = useListResource('/trainer/students', ready && tab === TAB.PARTICIPANTS, { quiet: true });
  const { timeZone } = useWeeklyChampionshipSources(isWeekly, { withStudents: false });
  return { resource, challenge, isWeekly, tab, setTab, consistency, ranking, participants, students, timeZone };
};

// Runs a write that reports success: true once done, false after showing the error
const attempt = async (write, fail) => {
  try {
    await write();
    return true;
  } catch (error) {
    fail(error);
    return false;
  }
};

// Writes of the page: bonuses, participants, settings and the lifecycle, each refreshing what it changes
const useChallengeWrites = (id, data) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { resource, ranking, participants, consistency } = data;
  const fail = (error) => showToast(error.userMessage || translateError(error), 'error');
  const giveBonus = (studentId, points, reason) => api.post(`/trainer/challenges/${id}/students/${studentId}/bonus`, reason ? { points, reason } : { points });
  const refreshPeople = () => Promise.all([resource.reload(), ranking.reload(), participants.reload(), data.isWeekly ? consistency.reload() : null]);
  const leaveWith = (message) => { showToast(message, 'success'); navigate(LIST_PATH); };
  return {
    giveSingleBonus: (student, points, reason) => attempt(async () => {
      await giveBonus(student.studentId, points, reason);
      showToast(`Bônus de +${points} pts enviado.`, 'success');
      await ranking.reload();
    }, fail),
    awardBulk: (studentIds, points, reason) => attempt(async () => {
      await Promise.all(studentIds.map((studentId) => giveBonus(studentId, points, reason)));
      showToast(`Bônus de +${points} aplicado a ${studentIds.length} aluno(s).`, 'success');
      await ranking.reload();
    }, fail),
    addParticipants: (studentIds) => attempt(async () => {
      await api.post(`/trainer/challenges/${id}/participants`, { studentIds });
      showToast('Participantes adicionados.', 'success');
      await refreshPeople();
    }, fail),
    removeParticipant: async (person) => {
      await api.delete(`/trainer/challenges/${id}/participants/${person.studentId}`);
      showToast('Participante removido.', 'success');
      await refreshPeople();
    },
    save: async (changes) => {
      resource.setChallenge((await api.patch(`/trainer/challenges/${id}`, changes)).data);
      if (data.isWeekly) consistency.reload();
    },
    closeEarly: async () => {
      const { data: { closesAt, ...updated } } = await api.post(`/trainer/challenges/${id}/close`);
      resource.setChallenge(updated);
      showToast('Campeonato vai encerrar no fechamento desta semana.', 'success');
      return { closesAt };
    },
    cancel: async () => { await api.post(`/trainer/challenges/${id}/cancel`); leaveWith('Campeonato cancelado.'); },
    remove: async () => { await api.delete(`/trainer/challenges/${id}`); leaveWith('Campeonato excluído.'); },
  };
};

// Page-level interactions: tab changes guarded by unsaved settings, bonus sheet, student panel, removal from a row and the bulk selection
const usePageActions = (data, writes, navigate) => {
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [bonusStudent, setBonusStudent] = useState(null);
  const [openStudent, setOpenStudent] = useState(null);
  const guard = (proceed) => {
    if (!(data.tab === TAB.SETTINGS && settingsDirty)) { proceed(); return; }
    requestConfirm({ message: DISCARD_MESSAGE, confirmLabel: 'Descartar', busyLabel: 'Saindo...', onConfirm: () => { setSettingsDirty(false); proceed(); } });
  };
  const changeTab = (next) => guard(() => { setSelecting(false); data.setTab(next); });
  return {
    dialogProps, selecting, setSelecting, bonusStudent, openStudent, setOpenStudent, setSettingsDirty, changeTab,
    goBack: () => guard(() => navigate(LIST_PATH)),
    openBonus: setBonusStudent,
    closeBonus: () => setBonusStudent(null),
    startBulkBonus: () => guard(() => { data.setTab(data.isWeekly ? TAB.POINTS : TAB.RANKING); setSelecting(true); }),
    askRemove: (person) => requestConfirm({ message: `Remover ${fullNameOf(person)} do campeonato?`, confirmLabel: 'Remover', busyLabel: 'Removendo...', onConfirm: () => writes.removeParticipant(person) }),
  };
};

// Notice of a closed dates championship, above its final ranking
const ClosedNotice = ({ endDate }) => (
  <div className="ds-banner ds-banner--inline challenge-locked-notice" role="note">
    <span className="ds-banner__icon" aria-hidden="true"><Lock size={20} strokeWidth={2} /></span>
    <p className="ds-banner__text type-body">{`Campeonato encerrado em ${dayMonthOf(endDate)}. O ranking é final e não pode ser editado.`}</p>
  </div>
);

ClosedNotice.propTypes = {
  endDate: PropTypes.string.isRequired,
};

// Cancelled notice of F2.5, in place of the podium and the classification
const CancelledNotice = () => (
  <section className="section-card">
    <EmptyBlock icon={Ban} title="Campeonato cancelado, sem classificação." />
  </section>
);

// XP ranking of either format: Pontos in a weekly championship, Ranking (with podium and the closed notice) in a dates one
const PointsPanel = ({ view }) => {
  const { challenge, data, writes, readOnly, actions } = view;
  const closed = challenge.status === CHALLENGE_STATUS.COMPLETED;
  return (
    <div className="championship-tab">
      {!data.isWeekly && closed && <ClosedNotice endDate={challenge.endDate} />}
      <PointsRankingTab
        entries={data.ranking.items}
        loading={data.ranking.loading}
        startDate={challenge.startDate}
        showPodium={!data.isWeekly}
        readOnly={readOnly}
        closed={closed}
        selecting={actions.selecting}
        onSelectingChange={actions.setSelecting}
        onBonus={actions.openBonus}
        onRemove={actions.askRemove}
        onAwardBulk={writes.awardBulk}
        onAddParticipants={() => actions.changeTab(TAB.PARTICIPANTS)}
      />
    </div>
  );
};

PointsPanel.propTypes = {
  view: PropTypes.object.isRequired,
};

// Ranking tab of a weekly championship: the consistency standings, or the cancelled notice
const ConsistencyPanel = ({ view }) => {
  const { challenge, data, writes, actions } = view;
  if (challenge.status === CHALLENGE_STATUS.CANCELLED) return <CancelledNotice />;
  return (
    <ConsistencyRankingTab
      data={data.consistency.data}
      loading={data.consistency.loading}
      error={data.consistency.error}
      onRetry={data.consistency.reload}
      timeZone={data.timeZone}
      onOpenStudent={actions.setOpenStudent}
      onBonus={(row) => actions.openBonus({ studentId: row.studentId, firstName: row.name })}
      onViewPoints={() => actions.changeTab(TAB.POINTS)}
      onRemove={actions.askRemove}
      onAdjustRules={() => actions.changeTab(TAB.SETTINGS)}
      onDelete={writes.remove}
      onAddParticipants={() => actions.changeTab(TAB.PARTICIPANTS)}
    />
  );
};

ConsistencyPanel.propTypes = {
  view: PropTypes.object.isRequired,
};

// Panel of the selected tab
const TabPanel = ({ view }) => {
  const { challenge, data, writes, readOnly, actions } = view;
  if (data.tab === TAB.PARTICIPANTS) {
    const pointsByStudent = Object.fromEntries(data.ranking.items.map((entry) => [entry.studentId, entry.points]));
    return <ParticipantsTab participants={data.participants.items} pointsByStudent={pointsByStudent} loading={data.participants.loading} readOnly={readOnly} students={data.students.items} onAdd={writes.addParticipants} onRemove={writes.removeParticipant} />;
  }
  if (data.tab === TAB.SETTINGS) {
    return <ChallengeSettingsTab challenge={challenge} isWeekly={data.isWeekly} timeZone={data.timeZone} closesAt={data.consistency.data?.closesAt ?? null} privacyCounts={data.consistency.data?.privacyCounts ?? null} onSave={writes.save} onCloseEarly={writes.closeEarly} onCancel={writes.cancel} onDelete={writes.remove} onDirtyChange={actions.setSettingsDirty} />;
  }
  if (data.tab === TAB.RANKING && data.isWeekly) return <ConsistencyPanel view={view} />;
  if (data.tab === TAB.RANKING && challenge.status === CHALLENGE_STATUS.CANCELLED) return <CancelledNotice />;
  return <PointsPanel view={view} />;
};

TabPanel.propTypes = {
  view: PropTypes.object.isRequired,
};

// Single bonus from a row: the sheet with the chips, closing once the bonus is given
const BonusSheet = ({ student, onGive, onClose }) => {
  const [submitting, setSubmitting] = useState(false);
  const handleAward = async (points, reason) => {
    setSubmitting(true);
    const given = await onGive(student, points, reason);
    setSubmitting(false);
    if (given) onClose();
  };
  return <StudentBonusSheet student={student} onAward={handleAward} onClose={onClose} disabled={submitting} />;
};

BonusSheet.propTypes = {
  student: PropTypes.object.isRequired,
  onGive: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// Championship the list handed over when it opened this page, if it is this one
const useKnownChallenge = (id) => {
  const { state } = useLocation();
  const known = state?.challenge;
  return known?.id === id ? known : null;
};

// Loading and not-found states: the header with what is known and skeleton rows, or the back link with the not-found block
const ResourceState = ({ status, known = null, onBack }) => {
  if (status === 'loading') {
    return (
      <div className="championship-tab challenge-loading">
        <ChallengeLoadingHeader challenge={known} onBack={onBack} />
        <SkeletonRows label="Carregando campeonato" count={LOADING_ROWS} />
      </div>
    );
  }
  return (
    <div className="championship-tab">
      <BackToChallenges onBack={onBack} />
      <section className="section-card"><EmptyBlock icon={Trophy} title="Campeonato não encontrado." description="Ele pode ter sido excluído ou o link está incorreto." actionLabel="Voltar para campeonatos" onAction={onBack} /></section>
    </div>
  );
};

ResourceState.propTypes = {
  status: PropTypes.oneOf(['loading', 'notFound']).isRequired,
  known: PropTypes.object,
  onBack: PropTypes.func.isRequired,
};

// Championship page: header, underline tabs (Ranking, Pontos, Participantes, Configurações; no Pontos in the dates format) and one component per tab, plus the loading and not-found states
const ChallengeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const known = useKnownChallenge(id);
  const data = useChallengeDetailData(id, useConsistencyRankingAccess());
  const writes = useChallengeWrites(id, data);
  const actions = usePageActions(data, writes, navigate);
  const { resource, challenge, consistency } = data;
  if (resource.status !== 'ready') return <ResourceState status={resource.status} known={known} onBack={() => navigate(LIST_PATH)} />;
  const view = { challenge, data, writes, readOnly: READ_ONLY_STATUSES.includes(challenge.status), actions };
  const closeLabel = consistency.data?.closesAt ? formatCloseLabel(consistency.data.closesAt, data.timeZone) : undefined;
  return (
    <div className="challenge-detail">
      <ChallengePageHeader challenge={challenge} today={todayIn(data.timeZone)} showDescription={data.isWeekly} onBack={actions.goBack} onBonus={actions.startBulkBonus} />
      <Tabs ariaLabel="Seções do campeonato" tabs={data.isWeekly ? WEEKLY_TABS : DATES_TABS} value={data.tab} onChange={actions.changeTab} />
      <div className="challenge-detail__panel"><TabPanel view={view} /></div>
      {actions.openStudent && <StudentPanel studentId={actions.openStudent.studentId} studentName={actions.openStudent.name} closeLabel={closeLabel} onClose={() => actions.setOpenStudent(null)} onChanged={consistency.reload} />}
      {actions.bonusStudent && <BonusSheet student={actions.bonusStudent} onGive={writes.giveSingleBonus} onClose={actions.closeBonus} />}
      {actions.dialogProps && <ConfirmDialog {...actions.dialogProps} />}
    </div>
  );
};

export default ChallengeDetail;
