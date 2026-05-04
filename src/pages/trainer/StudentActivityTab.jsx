import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAiChat } from '../../contexts/AiChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { translateError } from '../../i18n';
import useStudentDashboard from '../../hooks/useStudentDashboard';
import usePeriodPersistence from '../../hooks/usePeriodPersistence';
import {
  DASHBOARD_PERIOD_PRESETS,
  buildPeriod,
  getPeriodPresetLabel,
} from '../../constants/dashboardPeriod';
import { pickViz } from '../../constants/dashboardViz';
import { formatPeriodRangeShort } from '../../utils/formatDashboardDate';
import {
  computeWaveformBars,
  computeHeatmapWeeks,
} from '../../utils/computeDailyActivityViz';
import formatRpe from '../../utils/formatRpe';
import PeriodPickerSheet from '../../components/PeriodPickerSheet';
import EmptyDataMessage from '../../components/EmptyDataMessage';
import IArnoldFAB from '../../components/IArnoldFAB';
import PulseBand from '../../components/PulseBand';
import SessionInstrumentRow from '../../components/SessionInstrumentRow';
import ProgressionRow from '../../components/ProgressionRow';

const COMPLETION_THRESHOLDS = { warning: 0.5, success: 0.75 };
const DEFAULT_VISIBLE_PROGRESSION_ROWS = 5;

const getPulseBandState = (summary, loading) => {
  if (loading && !summary) return 'loading';
  if (!summary || summary.totalSessions === 0) return 'empty';
  const rate = summary.completionRate ?? 0;
  return rate >= COMPLETION_THRESHOLDS.success ? 'success' : 'warning';
};

const formatPercent = (rate) => {
  if (rate === null || rate === undefined) return null;
  return `${Math.round(rate * 100)}%`;
};

const formatDelta = (currentRate, previousRate) => {
  if (
    currentRate === null ||
    previousRate === null ||
    previousRate === undefined ||
    currentRate === undefined
  ) return null;
  const diff = Math.round((currentRate - previousRate) * 100);
  if (diff === 0) return '0%';
  return `${diff > 0 ? '+' : ''}${diff}%`;
};

const computePeriodDays = (period) => {
  if (!period?.from || !period?.to) return 30;
  const from = new Date(period.from);
  const to = new Date(period.to);
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
};

const groupProgressionByTraining = (entries) => {
  if (!Array.isArray(entries)) return [];
  const map = new Map();
  entries.forEach((entry) => {
    const key = entry.trainingId ?? entry.trainingName ?? 'sem-treino';
    if (!map.has(key)) {
      map.set(key, {
        trainingId: entry.trainingId,
        trainingName: entry.trainingName ?? 'Outros',
        rows: [],
      });
    }
    map.get(key).rows.push(entry);
  });
  return Array.from(map.values());
};

const sliceVisibleGroups = (groups, expandedIds) => {
  let remaining = DEFAULT_VISIBLE_PROGRESSION_ROWS;
  return groups.map((group, index) => {
    const expanded = expandedIds.has(group.trainingId ?? group.trainingName) || index === 0;
    if (!expanded) {
      return { ...group, expanded: false, visibleRows: [], hiddenCount: group.rows.length };
    }
    if (remaining <= 0) {
      return { ...group, expanded, visibleRows: [], hiddenCount: group.rows.length };
    }
    const visibleRows = group.rows.slice(0, remaining);
    remaining -= visibleRows.length;
    return {
      ...group,
      expanded,
      visibleRows,
      hiddenCount: Math.max(0, group.rows.length - visibleRows.length),
    };
  });
};

const expandAllGroups = (groups) =>
  groups.map((group) => ({
    ...group,
    expanded: true,
    visibleRows: group.rows,
    hiddenCount: 0,
  }));

const StudentActivityTab = ({ studentId, studentName, onStudentNotFound }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sendMessage } = useAiChat();

  const [period, setPeriod] = usePeriodPersistence(user?.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerError, setPickerError] = useState(null);
  const [showAllProgression, setShowAllProgression] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());
  const [iArnoldSubmitting, setIArnoldSubmitting] = useState(false);

  const dashboard = useStudentDashboard(studentId, period);

  const summary = dashboard.summary.data;
  const previousSummary = dashboard.previousSummary.data;
  const recentSessionsData = dashboard.recentSessions.data;
  const progressionData = dashboard.progression.data;
  const dailyActivityData = dashboard.dailyActivity.data;

  const summaryLoading = dashboard.summary.loading;
  const summaryError = dashboard.summary.error;
  const recentSessionsLoading = dashboard.recentSessions.loading;
  const recentSessionsError = dashboard.recentSessions.error;
  const progressionLoading = dashboard.progression.loading;
  const progressionError = dashboard.progression.error;

  const completionRate = summary?.completionRate ?? null;
  const previousRate = previousSummary?.completionRate ?? null;
  const adherenceLabel = formatPercent(completionRate);
  const deltaLabel = formatDelta(completionRate, previousRate);
  const totalSessions = summary?.totalSessions ?? 0;
  const completedSessions = summary?.sessionCounts?.completed ?? 0;

  const pulseBandState = getPulseBandState(summary, summaryLoading);

  const periodLabel =
    period.presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM
      ? formatPeriodRangeShort(period.from, period.to) || 'Período personalizado'
      : getPeriodPresetLabel(period.presetKey);

  const periodDays = computePeriodDays(period);
  const vizType = pickViz(periodDays);

  const vizData = useMemo(() => {
    const raw = dailyActivityData?.data ?? null;
    if (!raw) return { type: vizType, bars: [] };
    if (vizType === 'heatmap') {
      const { weeks, maxVolumeKg, dowLabels } = computeHeatmapWeeks(raw);
      return { type: 'heatmap', weeks, maxVolumeKg, dowLabels };
    }
    const { bars } = computeWaveformBars(raw);
    return { type: 'waveform', bars };
  }, [dailyActivityData, vizType]);

  const pulseBandStats = useMemo(() => {
    if (!summary) return null;
    return {
      vsAnterior: deltaLabel,
      maxStreak: summary.maxStreak ?? null,
      sessionsPerWeek: summary.sessionsPerWeek ?? null,
      daysSinceLast: summary.daysSinceLast ?? null,
    };
  }, [summary, deltaLabel]);

  const recentSessions = recentSessionsData?.data ?? [];
  const progressionEntries = useMemo(() => progressionData?.data ?? [], [progressionData]);

  const groupedProgression = useMemo(
    () => groupProgressionByTraining(progressionEntries),
    [progressionEntries],
  );

  const visibleGroups = useMemo(
    () =>
      showAllProgression
        ? expandAllGroups(groupedProgression)
        : sliceVisibleGroups(groupedProgression, expandedGroupIds),
    [groupedProgression, expandedGroupIds, showAllProgression],
  );

  const totalEntries = progressionEntries.length;
  const visibleCount = visibleGroups.reduce((acc, group) => acc + group.visibleRows.length, 0);
  const hasMoreProgression = totalEntries > visibleCount;

  const showInlineNotFound = dashboard.studentNotFound;
  const isRefetchingExistingData =
    summary !== null && (summaryLoading || recentSessionsLoading || progressionLoading);

  const handleAskIArnold = useCallback(async () => {
    if (iArnoldSubmitting) return;
    setIArnoldSubmitting(true);
    const target = studentName ?? 'esse aluno';
    const prefilled = `Como posso ajudar com ${target}?`;
    try {
      navigate('/trainer/ai-assistant');
      await sendMessage(prefilled);
    } catch (err) {
      console.error('[Atividade] iArnold prefill failed', translateError(err));
    } finally {
      setIArnoldSubmitting(false);
    }
  }, [iArnoldSubmitting, navigate, sendMessage, studentName]);

  if (showInlineNotFound) {
    if (onStudentNotFound) onStudentNotFound();
    return (
      <div className="dashboard-not-found">
        <p className="empty-state-title">Aluno não encontrado</p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/trainer/students')}
        >
          Voltar
        </button>
      </div>
    );
  }

  const handleApplyPeriod = (next) => {
    setPickerError(null);
    setPeriod(next);
    setPickerOpen(false);
    setShowAllProgression(false);
  };

  const handleCancelPicker = () => {
    setPickerError(null);
    setPickerOpen(false);
  };

  const handleSwitchToYear = () => {
    setPeriod(buildPeriod({ presetKey: DASHBOARD_PERIOD_PRESETS.LAST_1_YEAR }));
    setShowAllProgression(false);
  };

  const handleAssignProtocol = () => {
    navigate(`/trainer/protocols/new?studentId=${studentId}`);
  };

  const handleViewAllSessions = () => {
    const params = new URLSearchParams();
    if (period.from) params.set('from', period.from);
    if (period.to) params.set('to', period.to);
    navigate(`/trainer/students/${studentId}/sessions?${params.toString()}`);
  };

  const handleOpenProgression = (entry) => {
    const params = new URLSearchParams();
    if (period.from) params.set('from', period.from);
    if (period.to) params.set('to', period.to);
    navigate(
      `/trainer/students/${studentId}/exercises/${entry.exerciseId}/progression?${params.toString()}`,
    );
  };

  const handleToggleGroup = (group) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      const id = group.trainingId ?? group.trainingName;
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderPulseBand = () => {
    if (summaryError && !summary) {
      return (
        <BlockErrorState onRetry={() => dashboard.retryBlock('summary')} />
      );
    }

    if (!summary && !summaryLoading) return null;

    if (!summary && summaryLoading) {
      return (
        <PulseBand
          state="loading"
          periodLabel={periodLabel}
          protocol={null}
          adherenceLabel={null}
          deltaLabel={null}
          completedSessions={0}
          totalSessions={0}
          vizData={vizData}
          stats={null}
          onPeriodClick={() => setPickerOpen(true)}
          onAssignProtocol={handleAssignProtocol}
        />
      );
    }

    if (totalSessions === 0) {
      return (
        <>
          <PulseBand
            state="empty"
            periodLabel={periodLabel}
            protocol={summary.currentProtocol ?? null}
            adherenceLabel={null}
            deltaLabel={null}
            completedSessions={0}
            totalSessions={0}
            vizData={vizData}
            stats={null}
            onPeriodClick={() => setPickerOpen(true)}
            onAssignProtocol={handleAssignProtocol}
          />
          <EmptyDataMessage
            title="Aluno ainda não treinou nesse período"
            description="Tente ampliar a janela ou verifique a rotina ativa."
            action={(
              <button type="button" className="btn-secondary" onClick={handleSwitchToYear}>
                Ver últimos 12 meses
              </button>
            )}
          />
        </>
      );
    }

    return (
      <PulseBand
        state={pulseBandState}
        periodLabel={periodLabel}
        protocol={summary.currentProtocol ?? null}
        adherenceLabel={adherenceLabel}
        deltaLabel={deltaLabel}
        completedSessions={completedSessions}
        totalSessions={totalSessions}
        vizData={vizData}
        stats={pulseBandStats}
        onPeriodClick={() => setPickerOpen(true)}
        onAssignProtocol={handleAssignProtocol}
      />
    );
  };

  const renderSessionsPanel = () => {
    if (recentSessionsLoading && recentSessions.length === 0 && !recentSessionsError) {
      return <RecentSessionsSkeleton />;
    }
    if (recentSessionsError && recentSessions.length === 0) {
      return <BlockErrorState onRetry={() => dashboard.retryBlock('recentSessions')} />;
    }
    if (recentSessions.length === 0) return null;

    return (
      <div className="scan-zone-panel" aria-labelledby="activity-recent-heading">
        <header className="scan-section-header">
          <h2 id="activity-recent-heading" className="scan-section-eyebrow">
            Sessões recentes
          </h2>
          <button
            type="button"
            className="scan-section-link"
            onClick={handleViewAllSessions}
          >
            Ver todas
          </button>
        </header>
        <div className="scan-zone-stack">
          {recentSessions.map((session) => {
            const total = (session.completedSets ?? 0) + (session.skippedSets ?? 0);
            const metaText =
              session.completedSets != null && total > 0
                ? `${session.completedSets} de ${total} séries`
                : null;
            const rpeText = formatRpe(session.averageRpe ?? null);
            return (
              <SessionInstrumentRow
                key={session.id}
                status={session.status}
                date={session.startedAt ? session.startedAt.slice(0, 10) : null}
                sessionName={session.trainingName ?? 'Treino'}
                metaText={metaText}
                noteText={session.trainerNote ?? null}
                rpeText={rpeText}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderProgressionPanel = () => {
    if (progressionLoading && progressionEntries.length === 0 && !progressionError) {
      return <ProgressionSkeleton />;
    }
    if (progressionError && progressionEntries.length === 0) {
      return <BlockErrorState onRetry={() => dashboard.retryBlock('progression')} />;
    }
    if (progressionEntries.length === 0) return null;

    return (
      <div className="scan-zone-panel" aria-labelledby="activity-progression-heading">
        <header className="scan-section-header">
          <h2 id="activity-progression-heading" className="scan-section-eyebrow">
            Progressão de carga
            <span className="scan-section-eyebrow-suffix">· vs 1ª sessão</span>
          </h2>
        </header>
        <div className="progression-groups">
          {visibleGroups.map((group) => (
            <div
              key={group.trainingId ?? group.trainingName}
              className="progression-group"
            >
              <button
                type="button"
                className="progression-group-header"
                aria-expanded={group.expanded}
                onClick={() => handleToggleGroup(group)}
              >
                <span className="progression-group-letter" aria-hidden="true">
                  {(group.trainingName ?? 'O').charAt(0).toUpperCase()}
                </span>
                <span className="progression-group-title">{group.trainingName}</span>
                <span className="progression-group-meta">
                  {group.rows.length}{' '}
                  {group.rows.length === 1 ? 'exercício' : 'exercícios'}
                </span>
                {group.expanded ? (
                  <ChevronUp size={16} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
                )}
              </button>
              {group.expanded && group.visibleRows.length > 0 && (
                <ul className="progression-list">
                  {group.visibleRows.map((entry) => (
                    <ProgressionRow
                      key={`${entry.exerciseId}-${entry.trainingId ?? ''}`}
                      entry={entry}
                      onOpen={() => handleOpenProgression(entry)}
                    />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        {progressionEntries.length === 20 && (
          <p className="activity-section-footnote text-sm text-muted">
            Mostrando os 20 mais frequentes neste período
          </p>
        )}
        {(hasMoreProgression || showAllProgression) &&
          progressionEntries.length > DEFAULT_VISIBLE_PROGRESSION_ROWS && (
            <div className="activity-section-footer">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setShowAllProgression((prev) => !prev)}
              >
                {showAllProgression
                  ? 'Mostrar menos'
                  : `Ver todos os ${progressionEntries.length} exercícios`}
              </button>
            </div>
          )}
      </div>
    );
  };

  const sessionsPanel = renderSessionsPanel();
  const progressionPanel = renderProgressionPanel();
  const hasScanContent = sessionsPanel !== null || progressionPanel !== null;

  return (
    <div className="activity-tab">
      <div
        className={`activity-content${
          isRefetchingExistingData ? ' activity-content--refetching' : ''
        }`}
        aria-busy={isRefetchingExistingData}
      >
        {renderPulseBand()}
        {hasScanContent && (
          <section className="scan-zone">
            {sessionsPanel}
            {progressionPanel}
          </section>
        )}
      </div>

      <IArnoldFAB
        emphasized={completionRate !== null && completionRate < COMPLETION_THRESHOLDS.warning}
        label="Perguntar ao iArnold"
        onClick={handleAskIArnold}
        disabled={iArnoldSubmitting}
      />

      <PeriodPickerSheet
        open={pickerOpen}
        currentPeriod={period}
        onApply={handleApplyPeriod}
        onCancel={handleCancelPicker}
        errorMessage={pickerError}
      />
    </div>
  );
};

StudentActivityTab.propTypes = {
  studentId: PropTypes.string.isRequired,
  studentName: PropTypes.string,
  onStudentNotFound: PropTypes.func,
};

const RecentSessionsSkeleton = () => (
  <div className="activity-section-skeleton" aria-hidden="true">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-card" />
    <div className="skeleton skeleton-card" />
    <div className="skeleton skeleton-card" />
  </div>
);

const ProgressionSkeleton = () => (
  <div className="activity-section-skeleton" aria-hidden="true">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-card" />
    <div className="skeleton skeleton-card" />
  </div>
);

const BlockErrorState = ({ onRetry }) => (
  <div className="activity-block-error" role="alert">
    <p>Falha ao carregar</p>
    <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
      Tentar novamente
    </button>
  </div>
);

BlockErrorState.propTypes = {
  onRetry: PropTypes.func.isRequired,
};

export default StudentActivityTab;
