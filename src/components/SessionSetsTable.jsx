import { useState } from 'react';
import PropTypes from 'prop-types';
import { MessageCircle } from 'lucide-react';
import Badge from './ds/Badge';

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
      <p className="type-body session-sets__empty">Nenhuma série registrada.</p>
    );
  }

  return (
    <div className="session-sets">
      <table className="sets-table">
        <thead>
          <tr>
            <th className="type-caption">Série</th>
            <th className="type-caption">Carga</th>
            <th className="type-caption">Reps</th>
            <th className="type-caption table-col-desktop-only">RPE</th>
            <th className="type-caption">Status</th>
          </tr>
        </thead>
        <tbody>
          {setLogs.map((setLog) => {
            const hasNote = Boolean(setLog.notes);
            const noteOpen = openNoteIds.has(setLog.id);

            return [
              <tr key={setLog.id}>
                <td className="type-body">{setLog.setNumber}</td>
                <td className="type-body sets-table__num">
                  {setLog.load != null ? `${setLog.load} kg` : '—'}
                </td>
                <td className="type-body sets-table__num">
                  {setLog.repetitions != null ? setLog.repetitions : '—'}
                  {setLog.rpe != null && (
                    <span className="table-col-mobile-only type-caption sets-table__rpe-inline">
                      RPE {setLog.rpe}
                    </span>
                  )}
                </td>
                <td className="type-body sets-table__num table-col-desktop-only">
                  {setLog.rpe != null ? setLog.rpe : '—'}
                </td>
                <td>
                  <span className="sets-table__status">
                    {setLog.completed ? (
                      <Badge tone="success" variant="tag">Completo</Badge>
                    ) : (
                      <Badge tone="neutral" variant="tag">Pulado</Badge>
                    )}
                    {hasNote && (
                      <button
                        type="button"
                        className="icon-button sets-table__note-trigger"
                        onClick={(e) => { e.stopPropagation(); handleToggleNote(setLog.id); }}
                        aria-label={noteOpen ? 'Ocultar nota do aluno' : 'Ver nota do aluno'}
                        aria-expanded={noteOpen}
                      >
                        <MessageCircle size={16} strokeWidth={2} aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </td>
              </tr>,
              hasNote && noteOpen && (
                <tr key={`${setLog.id}-note`}>
                  <td colSpan={5} className="type-body sets-table__note">
                    <span className="type-caption-strong sets-table__note-label">Aluno</span>
                    {setLog.notes}
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
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
