import { useState } from 'react';
import PropTypes from 'prop-types';
import { Check, X, MessageCircle } from 'lucide-react';

/**
 * Renders the sets table for a single exercise log inside SessionExerciseCard.
 *
 * @param {object[]} setLogs - Array of setLog objects from the API
 */
const SessionSetsTable = ({ setLogs }) => {
  const [openNoteIds, setOpenNoteIds] = useState(new Set());

  const handleToggleNote = (setLogId) => {
    setOpenNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(setLogId)) {
        next.delete(setLogId);
      } else {
        next.add(setLogId);
      }
      return next;
    });
  };

  if (!setLogs || setLogs.length === 0) {
    return (
      <p className="note-panel-text note-panel-text--empty sets-table-empty">
        Nenhuma série registrada.
      </p>
    );
  }

  return (
    <table className="sets-table">
      <thead>
        <tr>
          <th>Série</th>
          <th className="sets-table-th-num">Carga</th>
          <th className="sets-table-th-num">Reps</th>
          <th className="sets-table-th-num">
            RPE
            <span className="sets-table-th-hint" aria-hidden="true">(Esforço)</span>
          </th>
          <th className="sets-table-th-num">Status</th>
        </tr>
      </thead>
      <tbody>
        {setLogs.map((setLog) => {
          const isSkipped = !setLog.completed;
          const hasNote = Boolean(setLog.notes);
          const noteOpen = openNoteIds.has(setLog.id);

          return [
            <tr key={setLog.id}>
              <td>
                <span className="sets-table-set-num">
                  <span className={`sets-table-bar${isSkipped ? ' sets-table-bar--skipped' : ''}`} aria-hidden="true" />
                  {setLog.setNumber}
                </span>
              </td>
              <td className="sets-table-num">
                {setLog.load != null ? `${setLog.load} kg` : '—'}
              </td>
              <td className="sets-table-num">
                {setLog.repetitions != null ? setLog.repetitions : '—'}
              </td>
              <td className="sets-table-num">
                {setLog.rpe != null ? setLog.rpe : '—'}
              </td>
              <td className="sets-table-status-cell">
                {isSkipped ? (
                  <span className="sets-table-status sets-table-status--skipped">
                    <X size={11} strokeWidth={2} aria-hidden="true" />
                    Pulada
                  </span>
                ) : (
                  <span className="sets-table-status">
                    <Check size={11} strokeWidth={2} aria-hidden="true" />
                    Completa
                  </span>
                )}
                {hasNote && (
                  <button
                    type="button"
                    className="sets-table-note-trigger"
                    onClick={(e) => { e.stopPropagation(); handleToggleNote(setLog.id); }}
                    aria-label={noteOpen ? 'Ocultar nota do aluno' : 'Ver nota do aluno'}
                    aria-expanded={noteOpen}
                  >
                    <MessageCircle size={11} strokeWidth={2} aria-hidden="true" />
                  </button>
                )}
              </td>
            </tr>,
            hasNote && noteOpen && (
              <tr key={`${setLog.id}-note`} className="sets-table-note-row">
                <td colSpan={5}>
                  <span className="sets-table-note-row-label">Aluno</span>
                  {setLog.notes}
                </td>
              </tr>
            ),
          ];
        })}
      </tbody>
    </table>
  );
};

SessionSetsTable.propTypes = {
  setLogs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      setNumber: PropTypes.number.isRequired,
      load: PropTypes.number,
      repetitions: PropTypes.number,
      rpe: PropTypes.number,
      completed: PropTypes.bool.isRequired,
      notes: PropTypes.string,
    }),
  ).isRequired,
};

export default SessionSetsTable;
