import PropTypes from 'prop-types';
import { useToast } from '../contexts/ToastContext';

/**
 * Format an ISO timestamp → "18 Ago 2025, 07h15".
 */
const formatNoteTimestamp = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const day = d.getDate();
  const monthRaw = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  return `${day} ${month} ${d.getFullYear()}, ${time}`;
};

/**
 * Two equal-height section cards: student note + trainer note (stub).
 *
 * The trainer note is a stub — backend has no dedicated field yet.
 * TODO: add `trainerNote` column to WorkoutSession + migration, then wire
 * the Editar button to a real editor instead of the "Em breve" toast.
 *
 * @param {object}      props
 * @param {string|null} props.studentNote - session.notes from the API (student's note)
 * @param {string|null} props.finishedAt  - ISO timestamp when session ended
 */
const SessionNotesGrid = ({ studentNote, finishedAt }) => {
  const { showToast } = useToast();
  const timestamp = formatNoteTimestamp(finishedAt);

  const handleEditTrainerNote = () => {
    showToast('Em breve', 'info');
  };

  return (
    <div className="session-notes">
      <section className="section-card session-notes__card" aria-labelledby="session-note-student">
        <header className="session-notes__header">
          <h2 id="session-note-student" className="type-body-lg-strong">Anotação do aluno</h2>
          {timestamp && <span className="type-caption session-notes__timestamp">{timestamp}</span>}
        </header>
        {studentNote ? (
          <p className="type-body session-notes__text">{studentNote}</p>
        ) : (
          <p className="type-body session-notes__text session-notes__text--empty">
            Nenhuma anotação registrada
          </p>
        )}
      </section>

      <section className="section-card session-notes__card" aria-labelledby="session-note-trainer">
        <header className="session-notes__header">
          <h2 id="session-note-trainer" className="type-body-lg-strong">Anotação do treinador</h2>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleEditTrainerNote}
            aria-label="Editar anotação do treinador"
          >
            Editar
          </button>
        </header>
        <p className="type-body session-notes__text session-notes__text--empty">Recurso em breve</p>
      </section>
    </div>
  );
};

SessionNotesGrid.propTypes = {
  studentNote: PropTypes.string,
  finishedAt: PropTypes.string,
};

export default SessionNotesGrid;
