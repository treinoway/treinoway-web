import { useState } from 'react';
import PropTypes from 'prop-types';
import { MessageCircle } from 'lucide-react';

const STATUS_BAR_MODIFIER = {
  completed: 'session-bar--success',
  partial: 'session-bar--partial',
  abandoned: 'session-bar--abandoned',
};

/**
 * Session instrument row — 5-column grid.
 *
 * Grid columns: 4px status bar | 56px date block | 1fr session name+meta | auto rpe chip | 26px note trigger
 *
 * @param {object}        props
 * @param {string}        props.status       - 'completed' | 'partial' | 'abandoned'
 * @param {string}        props.date         - ISO date string 'YYYY-MM-DD'
 * @param {string}        props.sessionName  - Training name
 * @param {string|null}   props.metaText     - Secondary info line (e.g. "8 de 10 séries")
 * @param {string|null}   props.noteText     - Trainer note; if present, note trigger button shows
 * @param {string|null}   props.rpeText      - Bare RPE value (e.g. "7,5"); the chip renders its own "RPE" prefix
 * @param {Function|null} props.onClick      - Optional: navigate to session detail when the row is clicked
 */
const SessionInstrumentRow = ({
  status,
  date,
  sessionName,
  metaText,
  noteText,
  rpeText,
  onClick,
}) => {
  const [noteOpen, setNoteOpen] = useState(false);

  const parsed = date ? new Date(date + 'T00:00:00') : null;
  const isValidDate = parsed && !isNaN(parsed.getTime());

  const dowLabel = isValidDate
    ? parsed.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()
    : '—';
  const dayLabel = isValidDate ? String(parsed.getDate()).padStart(2, '0') : '—';
  const monthLabel = isValidDate
    ? parsed.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    : '—';

  const barModifier = STATUS_BAR_MODIFIER[status] ?? '';
  const hasNote = Boolean(noteText);
  const isClickable = Boolean(onClick);

  const handleNoteToggle = (e) => {
    e.stopPropagation();
    setNoteOpen((prev) => !prev);
  };

  const handleRowClick = () => {
    if (onClick) onClick();
  };

  const handleRowKeyDown = (e) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`session-row${isClickable ? ' session-row--clickable' : ''}`}
      aria-label={`Sessão ${sessionName ?? ''} em ${date ?? ''}: ${status}`}
      onClick={isClickable ? handleRowClick : undefined}
      onKeyDown={isClickable ? handleRowKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {/* Col 1: status bar */}
      <div className={`session-bar${barModifier ? ` ${barModifier}` : ''}`} aria-hidden="true" />

      {/* Col 2: date block */}
      <div className="session-date" aria-label={`Data: ${dowLabel} ${dayLabel} ${monthLabel}`}>
        <span className="session-date-day-of-week">{dowLabel}</span>
        <span className="session-date-day">{dayLabel}</span>
        <span className="session-date-month">{monthLabel}</span>
      </div>

      {/* Col 3: session name + meta */}
      <div className="session-main">
        <span className="session-name" title={sessionName ?? ''}>{sessionName ?? '—'}</span>
        {metaText && <span className="session-meta">{metaText}</span>}
      </div>

      {/* Col 4: RPE chip */}
      {rpeText ? (
        <span className="session-rpe-chip">
          <span className="session-rpe-chip-label">RPE</span>
          {rpeText}
        </span>
      ) : (
        <span aria-hidden="true" />
      )}

      {/* Col 5: note trigger or placeholder */}
      {hasNote ? (
        <button
          type="button"
          className="session-note-trigger"
          onClick={handleNoteToggle}
          aria-label={noteOpen ? 'Fechar anotação' : 'Ver anotação do treino'}
          aria-expanded={noteOpen}
        >
          <MessageCircle size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : (
        <span className="session-trigger-placeholder" aria-hidden="true" />
      )}

      {/* Inline note expansion (spans cols 2–5) */}
      {hasNote && noteOpen && (
        <div className="session-note" role="region" aria-label="Anotação do treino">
          <div className="session-note-row">
            <span className="session-note-label">Anotação</span>
            <span className="session-note-value">{noteText}</span>
          </div>
        </div>
      )}
    </div>
  );
};

SessionInstrumentRow.propTypes = {
  status: PropTypes.oneOf(['completed', 'partial', 'abandoned']).isRequired,
  date: PropTypes.string,
  sessionName: PropTypes.string,
  metaText: PropTypes.string,
  noteText: PropTypes.string,
  rpeText: PropTypes.string,
  onClick: PropTypes.func,
};

export default SessionInstrumentRow;
