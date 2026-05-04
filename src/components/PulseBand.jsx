import PropTypes from 'prop-types';
import { ChevronDown, Activity, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import PulseWaveform from './PulseWaveform';
import PulseHeatmap from './PulseHeatmap';
import PulseStatChip from './PulseStatChip';

/**
 * Pulse Band — dark stadium hero for the Activity tab.
 *
 * States:
 *   - 'warning'  default, accent dot, orange ring on status pill
 *   - 'success'  adherence ≥ 0.80, green dot + number
 *   - 'empty'    no sessions ever (new student)
 *   - 'loading'  skeleton shimmer while data is in flight
 *
 * @param {object}   props
 * @param {'warning'|'success'|'empty'|'loading'} props.state
 * @param {string|null}  props.periodLabel
 * @param {object|null}  props.protocol       — { name, weekNumber, totalWeeks }
 * @param {string|null}  props.adherenceLabel — "62%" or null
 * @param {string|null}  props.deltaLabel     — "+8%" / "-3%" or null
 * @param {number}       props.completedSessions
 * @param {number}       props.totalSessions
 * @param {object|null}  props.vizData        — { type:'waveform'|'heatmap', bars?, weeks?, dowLabels?, maxVolumeKg? }
 * @param {object}       props.stats          — { vsAnterior, maxStreak, sessionsPerWeek, daysSinceLast }
 * @param {function}     props.onPeriodClick
 * @param {function}     props.onAssignProtocol
 */
const PulseBand = ({
  state,
  periodLabel,
  protocol,
  adherenceLabel,
  deltaLabel,
  completedSessions,
  totalSessions,
  vizData,
  stats,
  onPeriodClick,
  onAssignProtocol,
}) => {
  const isLoading = state === 'loading';
  const isEmpty = state === 'empty';
  const isSuccess = state === 'success';

  const bandClass = [
    'pulse-band',
    isLoading ? 'pulse-band--loading' : '',
    isEmpty ? 'pulse-band--empty' : '',
    isSuccess ? 'pulse-band--success' : '',
  ].filter(Boolean).join(' ');

  const numberClass = [
    'pulse-number',
    isEmpty ? 'pulse-number--empty' : '',
    isSuccess ? 'pulse-number--success' : '',
  ].filter(Boolean).join(' ');

  const statusPillClass = isSuccess ? 'pulse-status pulse-status--success' : 'pulse-status';

  const deltaIsUp = deltaLabel && deltaLabel.startsWith('+');
  const DeltaIcon = deltaIsUp ? ArrowUp : ArrowDown;

  const displayAdherence = adherenceLabel ?? '—';

  const renderSash = () => {
    const periodChip = (
      <button
        type="button"
        className="pulse-period-chip"
        onClick={onPeriodClick}
        aria-haspopup="dialog"
        aria-label={`Alterar período. Atual: ${periodLabel ?? ''}`}
      >
        <span>{periodLabel ?? '—'}</span>
        <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
      </button>
    );

    if (isEmpty) {
      return (
        <div className="pulse-sash">
          <div className="pulse-sash-protocol">
            <button
              type="button"
              className="pulse-sash-cta"
              onClick={onAssignProtocol}
              aria-label="Atribuir rotina ao aluno"
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              Atribuir rotina
            </button>
          </div>
          <div className="pulse-sash-actions">{periodChip}</div>
        </div>
      );
    }

    return (
      <div className="pulse-sash">
        <div className="pulse-sash-protocol">
          {protocol ? (
            <>
              <span className="pulse-sash-icon" aria-hidden="true">
                <Activity size={14} strokeWidth={2} />
              </span>
              <span className="pulse-sash-text">
                <span className="pulse-sash-eyebrow">Rotina ativa</span>
                <span className="pulse-sash-name">
                  {protocol.name}
                  {protocol.weekNumber && protocol.totalWeeks && (
                    <span className="pulse-sash-week">
                      · sem {protocol.weekNumber}/{protocol.totalWeeks}
                    </span>
                  )}
                </span>
              </span>
            </>
          ) : (
            <button
              type="button"
              className="pulse-sash-cta"
              onClick={onAssignProtocol}
              aria-label="Atribuir rotina ao aluno"
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              Atribuir rotina
            </button>
          )}
        </div>
        <div className="pulse-sash-actions">{periodChip}</div>
      </div>
    );
  };

  const renderViz = () => {
    if (!vizData) {
      return <PulseWaveform bars={[]} loading={isLoading} />;
    }
    if (vizData.type === 'heatmap') {
      return (
        <PulseHeatmap
          weeks={vizData.weeks ?? []}
          dowLabels={vizData.dowLabels ?? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']}
          maxVolumeKg={vizData.maxVolumeKg ?? 0}
        />
      );
    }
    return <PulseWaveform bars={vizData.bars ?? []} loading={isLoading} />;
  };

  return (
    <div className={bandClass}>
      {renderSash()}

      <div className="pulse-diagnosis">
        <span className="pulse-eyebrow">
          <span className="pulse-eyebrow-dot" aria-hidden="true" />
          Aderência
        </span>
        <div className="pulse-number-row">
          <div>
            <span className={numberClass} aria-label={`Aderência: ${displayAdherence}`}>
              {isEmpty ? '—' : displayAdherence.replace('%', '')}
              {!isEmpty && adherenceLabel && (
                <span className="pulse-number-unit">%</span>
              )}
              {isEmpty && null}
            </span>
          </div>
          <div className="pulse-aside">
            <span className={statusPillClass}>
              {isSuccess ? 'Em dia' : isEmpty ? 'Sem dados' : 'Atenção'}
            </span>
            {deltaLabel && (
              <span className={`pulse-delta${deltaIsUp ? '' : ' pulse-delta--down'}`}>
                <DeltaIcon size={12} strokeWidth={2} aria-hidden="true" />
                {deltaLabel}
              </span>
            )}
          </div>
        </div>
        {!isEmpty && (
          <p className="pulse-caption">
            <strong>{completedSessions}</strong> de <strong>{totalSessions}</strong> sessões concluídas
          </p>
        )}
      </div>

      {renderViz()}

      <div className="pulse-stats" aria-label="Estatísticas do período">
        <PulseStatChip
          label="Vs anterior"
          value={stats?.vsAnterior ?? null}
          isEmpty={!stats?.vsAnterior}
        />
        <PulseStatChip
          label="Maior streak"
          value={stats?.maxStreak != null ? `${stats.maxStreak}d` : null}
          isEmpty={stats?.maxStreak == null}
        />
        <PulseStatChip
          label="Treinos/sem"
          value={stats?.sessionsPerWeek != null
            ? Number(stats.sessionsPerWeek).toFixed(1)
            : null}
          isEmpty={stats?.sessionsPerWeek == null}
        />
        <PulseStatChip
          label="Sem treinar"
          value={stats?.daysSinceLast != null ? `${stats.daysSinceLast}d` : null}
          isEmpty={stats?.daysSinceLast == null}
        />
      </div>
    </div>
  );
};

PulseBand.propTypes = {
  state: PropTypes.oneOf(['warning', 'success', 'empty', 'loading']).isRequired,
  periodLabel: PropTypes.string,
  protocol: PropTypes.shape({
    name: PropTypes.string.isRequired,
    weekNumber: PropTypes.number,
    totalWeeks: PropTypes.number,
  }),
  adherenceLabel: PropTypes.string,
  deltaLabel: PropTypes.string,
  completedSessions: PropTypes.number,
  totalSessions: PropTypes.number,
  vizData: PropTypes.shape({
    type: PropTypes.oneOf(['waveform', 'heatmap']).isRequired,
    bars: PropTypes.array,
    weeks: PropTypes.array,
    dowLabels: PropTypes.arrayOf(PropTypes.string),
    maxVolumeKg: PropTypes.number,
  }),
  stats: PropTypes.shape({
    vsAnterior: PropTypes.string,
    maxStreak: PropTypes.number,
    sessionsPerWeek: PropTypes.number,
    daysSinceLast: PropTypes.number,
  }),
  onPeriodClick: PropTypes.func.isRequired,
  onAssignProtocol: PropTypes.func.isRequired,
};

export default PulseBand;
