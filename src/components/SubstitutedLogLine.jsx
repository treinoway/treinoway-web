import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { t } from '../i18n';

const interpolate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, key) =>
    values[key] !== undefined ? String(values[key]) : `{${key}}`
  );

/**
 * Collapsed single-line state shown after a student swaps an exercise.
 * Format: `Original → New · Trocado há Ns · [Desfazer]`
 *
 * The "Desfazer" button is only available for `undoWindowSeconds`
 * (default 15) AND only when the parent has not yet logged a set on
 * the new exercise (signalled via `undoDisabled`). The component
 * auto-hides itself when both windows close — parent should treat the
 * `onAutoHide` callback as the signal to stop rendering the component.
 */
const SubstitutedLogLine = ({
  originalName,
  newName,
  swappedAt,
  undoWindowSeconds = 15,
  undoDisabled = false,
  onUndo = null,
  onAutoHide = null,
}) => {
  const [secondsSince, setSecondsSince] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(swappedAt).getTime()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const next = Math.max(
        0,
        Math.floor((Date.now() - new Date(swappedAt).getTime()) / 1000)
      );
      setSecondsSince(next);
      if (next >= undoWindowSeconds && onAutoHide) {
        onAutoHide();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [swappedAt, undoWindowSeconds, onAutoHide]);

  const agoLabel = interpolate(
    t('substitute.swappedAgo') || 'Trocado há {seconds}s',
    { seconds: secondsSince }
  );
  const undoLabel = t('substitute.swapUndo') || 'Desfazer';
  const canUndo =
    !undoDisabled && secondsSince < undoWindowSeconds && typeof onUndo === 'function';

  return (
    <div className="substituted-log-line" role="status" aria-live="polite">
      <span className="substituted-log-line-original">{originalName}</span>
      <span className="substituted-log-line-arrow" aria-hidden="true">
        →
      </span>
      <span className="substituted-log-line-new">{newName}</span>
      <span className="substituted-log-line-meta">
        <span>{agoLabel}</span>
        {canUndo && (
          <button
            type="button"
            className="substituted-log-line-undo"
            onClick={onUndo}
          >
            {undoLabel}
          </button>
        )}
      </span>
    </div>
  );
};

SubstitutedLogLine.propTypes = {
  originalName: PropTypes.string.isRequired,
  newName: PropTypes.string.isRequired,
  swappedAt: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date),
    PropTypes.number,
  ]).isRequired,
  undoWindowSeconds: PropTypes.number,
  undoDisabled: PropTypes.bool,
  onUndo: PropTypes.func,
  onAutoHide: PropTypes.func,
};

export default SubstitutedLogLine;
