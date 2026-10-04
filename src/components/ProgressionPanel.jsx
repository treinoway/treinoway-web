import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import ProgressionRow from './ProgressionRow';
import {
  groupProgressionByTraining,
  sliceVisibleGroups,
  expandAllGroups,
} from '../utils/groupProgression';
import { td } from '../utils/studentCockpit';

const DEFAULT_VISIBLE_PROGRESSION_ROWS = 5;

const BlockErrorState = ({ onRetry }) => (
  <div className="cockpit-card__error" role="alert">
    <p className="type-body">{td('progression.error')}</p>
    <button type="button" className="btn btn--secondary" onClick={onRetry}>
      {td('retry')}
    </button>
  </div>
);

BlockErrorState.propTypes = { onRetry: PropTypes.func.isRequired };

const PanelShell = ({ children }) => (
  <section className="section-card cockpit-card" aria-labelledby="cockpit-progression-heading">
    <header className="cockpit-card__header">
      <h3 id="cockpit-progression-heading" className="cockpit-card__title type-h3">
        {td('progression.title')}
        <span className="cockpit-card__title-suffix type-caption">{td('progression.suffix')}</span>
      </h3>
    </header>
    {children}
  </section>
);

PanelShell.propTypes = { children: PropTypes.node };

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
    return <PanelShell><div className="row-skeleton" aria-hidden="true" /></PanelShell>;
  }

  if (error && entries.length === 0) {
    return <PanelShell><BlockErrorState onRetry={onRetry} /></PanelShell>;
  }

  if (entries.length === 0) {
    return <PanelShell><p className="cockpit-card__muted type-body">{td('progression.empty')}</p></PanelShell>;
  }

  return (
    <PanelShell>
      <div className="progression-groups">
        {visible.map((group, index) => (
          <div
            key={group.trainingId ?? group.trainingName}
            className="progression-group"
          >
            <button
              type="button"
              className="progression-group-header"
              aria-expanded={group.expanded}
              aria-controls={`progression-group-${index}`}
              onClick={() => handleToggleGroup(group)}
            >
              <span className="progression-group-letter type-caption-strong" aria-hidden="true">
                {(group.trainingName ?? 'O').charAt(0).toUpperCase()}
              </span>
              <span className="progression-group-title type-body-lg-strong">{group.trainingName}</span>
              <span className="progression-group-meta type-caption">
                {group.rows.length === 1
                  ? td('progression.exerciseOne', { count: 1 })
                  : td('progression.exerciseOther', { count: group.rows.length })}
              </span>
              <ChevronDown
                size={20}
                strokeWidth={2}
                aria-hidden="true"
                className={`progression-group-chevron${
                  group.expanded ? ' progression-group-chevron--open' : ''
                }`}
              />
            </button>
            {group.expanded && group.visibleRows.length > 0 && (
              <ul id={`progression-group-${index}`} className="progression-list">
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
        <p className="cockpit-card__muted type-caption">
          {td('progression.topLimit')}
        </p>
      )}

      {(hasMore || showAll) && entries.length > DEFAULT_VISIBLE_PROGRESSION_ROWS && (
        <div className="cockpit-card__footer">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll
              ? td('progression.showLess')
              : td('progression.showAll', { count: entries.length })}
          </button>
        </div>
      )}
    </PanelShell>
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
