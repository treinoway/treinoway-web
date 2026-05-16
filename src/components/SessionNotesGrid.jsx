import PropTypes from 'prop-types';
import { User, MessageCircle, Pencil } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

/**
 * Two-panel grid: student note (orange stripe) + trainer note (blue stripe).
 *
 * The trainer note is a stub — backend has no dedicated field yet.
 * TODO: add `trainerNote` column to WorkoutSession + migration, then wire
 * the Edit button to a real editor instead of the "Em breve" toast.
 *
 * @param {object}      props
 * @param {string|null} props.studentNote - session.notes from the API (student's note)
 * @param {string}      props.studentName - Full name of the student
 * @param {string|null} props.finishedAt  - ISO timestamp when session ended
 */
const SessionNotesGrid = ({ studentNote, studentName, finishedAt }) => {
  const { showToast } = useToast();

  const formattedDate = (() => {
    if (!finishedAt) return null;
    const d = new Date(finishedAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  })();

  const handleEditTrainerNote = () => {
    // TODO: open trainer-note editor once backend column + migration is in place
    showToast('Em breve', 'info');
  };

  return (
    <div className="notes-grid">
      {/* Student note */}
      <section className="note-panel note-panel--student" aria-label="Anotação do aluno">
        <div className="note-panel-content">
          <span className="note-panel-eyebrow">
            <User size={14} strokeWidth={2} aria-hidden="true" />
            Anotação do aluno
          </span>
          {studentNote ? (
            <p className="note-panel-text">{studentNote}</p>
          ) : (
            <p className="note-panel-text note-panel-text--empty">
              Nenhuma anotação registrada.
            </p>
          )}
          {formattedDate && (
            <p className="note-panel-author">
              {studentName ?? 'Aluno'} · ao finalizar · {formattedDate}
            </p>
          )}
        </div>
      </section>

      {/* Trainer note (stub) */}
      <section className="note-panel note-panel--trainer" aria-label="Anotação do treinador">
        <div className="note-panel-content">
          <span className="note-panel-eyebrow">
            <MessageCircle size={14} strokeWidth={2} aria-hidden="true" />
            Anotação do treinador
          </span>
          <p className="note-panel-text note-panel-text--empty">
            Recurso em breve — adicione sua avaliação desta sessão.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={handleEditTrainerNote}
          aria-label="Editar anotação do treinador"
        >
          <Pencil size={14} strokeWidth={2} aria-hidden="true" />
          Editar
        </button>
      </section>
    </div>
  );
};

SessionNotesGrid.propTypes = {
  studentNote: PropTypes.string,
  studentName: PropTypes.string,
  finishedAt: PropTypes.string,
};

export default SessionNotesGrid;
