import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import ProgressionRow from './ProgressionRow';
import {
  groupProgressionByTraining,
  sliceVisibleGroups,
  expandAllGroups,
} from '../utils/groupProgression';

const DEFAULT_VISIBLE_PROGRESSION_ROWS = 5;

const ProgressionSkeleton = () => (
  <div className="activity-section-skeleton" aria-hidden="true">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-card" />
    <div className="skeleton skeleton-card" />
  </div>
);

const BlockErrorState = ({ onRetry }) => (
  <div className="activity-block-error" role="alert">
    <p>Falha ao carregar progressão</p>
    <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
      Tentar novamente
    </button>
  </div>
);

BlockErrorState.propTypes = { onRetry: PropTypes.func.isRequired };

const ProgressionPanel = ({
  entries,
  loading,
  error,
  onRetry,
  onOpenEntry,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());

  const grouped = useMemo(() => groupProgressionByTraining(entries), [entries]);

  const visible = useMemo(
    () => (showAll ? expandAllGroups(grouped) : sliceVisibleGroups(grouped, expandedGroupIds)),
    [grouped, expandedGroupIds, showAll],
  );

  const visibleCount = visible.reduce((acc, g) => acc + g.visibleRows.length, 0);
  const hasMore = entries.length > visibleCount;

  const handleToggleGroup = (group) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      const id = group.trainingId ?? group.trainingName;
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading && entries.length === 0 && !error) {
    return (
      <div className="cockpit-section">
        <ProgressionSkeleton />
      </div>
    );
  }

  if (error && entries.length === 0) {
    return (
      <div className="cockpit-section">
        <BlockErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div className="cockpit-section scan-zone-panel" aria-labelledby="cockpit-progression-heading">
      <header className="cockpit-section-header">
        <h2 id="cockpit-progression-heading" className="cockpit-section-eyebrow">
          Progressão de carga
          <span className="cockpit-section-eyebrow-suffix">· vs 1ª sessão</span>
        </h2>
      </header>

      <div className="progression-groups">
        {visible.map((group) => (
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
              <ChevronDown
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                className={`progression-group-chevron${
                  group.expanded ? ' progression-group-chevron--open' : ''
                }`}
              />
            </button>
            {group.expanded && group.visibleRows.length > 0 && (
              <ul className="progression-list">
                {group.visibleRows.map((entry) => (
                  <ProgressionRow
                    key={`${entry.exerciseId}-${entry.trainingId ?? ''}`}
                    entry={entry}
                    onOpen={() => onOpenEntry(entry)}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {entries.length === 20 && (
        <p className="activity-section-footnote text-sm text-muted">
          Mostrando os 20 mais frequentes neste período
        </p>
      )}

      {(hasMore || showAll) && entries.length > DEFAULT_VISIBLE_PROGRESSION_ROWS && (
        <div className="activity-section-footer">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll
              ? 'Mostrar menos'
              : `Ver todos os ${entries.length} exercícios`}
          </button>
        </div>
      )}
    </div>
  );
};

ProgressionPanel.propTypes = {
  entries: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.any,
  onRetry: PropTypes.func.isRequired,
  onOpenEntry: PropTypes.func.isRequired,
};

export default ProgressionPanel;
