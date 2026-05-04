import { useState } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, AlertTriangle, XCircle, StickyNote } from 'lucide-react';

const STATUS_BAR_MODIFIER = {
  completed: 'session-bar--success',
  partial: 'session-bar--partial',
  abandoned: 'session-bar--abandoned',
};

const STATUS_ICON_MODIFIER = {
  completed: 'session-status--completed',
  partial: 'session-status--partial',
  abandoned: 'session-status--abandoned',
};

const StatusIcon = ({ status }) => {
  if (status === 'completed') return <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />;
  if (status === 'partial') return <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />;
  if (status === 'abandoned') return <XCircle size={16} strokeWidth={2} aria-hidden="true" />;
  return null;
};

StatusIcon.propTypes = { status: PropTypes.string };

/**
 * Session instrument row — 5-column grid.
 *
 * Grid columns: 4px status bar | 56px date block | 1fr session name+meta | auto status chip | 26px note trigger
 *
 * @param {object}  props
 * @param {string}  props.status          - 'completed' | 'partial' | 'abandoned'
 * @param {string}  props.date            - ISO date string 'YYYY-MM-DD'
 * @param {string}  props.sessionName     - Training name
 * @param {string|null} props.metaText    - Secondary info line (e.g. "8 de 10 séries · 1 240 kg")
 * @param {string|null} props.noteText    - Trainer note; if present, note trigger button shows
 * @param {string|null} props.rpeText     - Formatted RPE string (e.g. "RPE 7,5"); null = omit
 */
const SessionInstrumentRow = ({
  status,
  date,
  sessionName,
  metaText,
  noteText,
  rpeText,
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
  const statusModifier = STATUS_ICON_MODIFIER[status] ?? '';
  const hasNote = Boolean(noteText);

  const handleNoteToggle = () => setNoteOpen((prev) => !prev);

  return (
    <div className="session-row" aria-label={`Sessão ${sessionName ?? ''} em ${date ?? ''}: ${status}`}>
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
        {(metaText || rpeText) && (
          <span className="session-meta">
            {metaText && <strong>{metaText}</strong>}
            {metaText && rpeText && ' · '}
            {rpeText}
          </span>
        )}
      </div>

      {/* Col 4: status chip */}
      <div className={`session-status${statusModifier ? ` ${statusModifier}` : ''}`}>
        <StatusIcon status={status} />
      </div>

      {/* Col 5: note trigger or placeholder */}
      {hasNote ? (
        <button
          type="button"
          className="session-note-trigger"
          onClick={handleNoteToggle}
          aria-label={noteOpen ? 'Fechar anotação' : 'Ver anotação do treino'}
          aria-expanded={noteOpen}
        >
          <StickyNote size={14} strokeWidth={2} aria-hidden="true" />
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
};

export default SessionInstrumentRow;
