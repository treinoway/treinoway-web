import PropTypes from 'prop-types';
import { MessageSquareQuote } from 'lucide-react';
import { formatLastWorkout } from '../../utils/studentRow';
import { td } from '../../utils/studentCockpit';

/**
 * "Última observação do aluno": the note the student left on their most recent
 * session that has one (recent-sessions `noteText`). Renders nothing without a note.
 */
const StudentLatestNoteCard = ({ session, studentName }) => {
  if (!session?.noteText) return null;
  const when = formatLastWorkout(session.startedAt);
  const attribution = [studentName, when?.toLowerCase(), session.trainingName].filter(Boolean).join(' · ');

  return (
    <section className="section-card cockpit-card note-card" aria-labelledby="student-note-heading">
      <h3 id="student-note-heading" className="cockpit-card__subtitle type-body">
        <MessageSquareQuote size={16} strokeWidth={2} aria-hidden="true" />
        {td('note.title')}
      </h3>
      <figure className="note-card__figure">
        <blockquote className="note-card__quote type-body-lg">“{session.noteText}”</blockquote>
        {attribution && <figcaption className="note-card__caption type-caption">{attribution}</figcaption>}
      </figure>
    </section>
  );
};

StudentLatestNoteCard.propTypes = {
  session: PropTypes.shape({
    noteText: PropTypes.string,
    startedAt: PropTypes.string,
    trainingName: PropTypes.string,
  }),
  studentName: PropTypes.string,
};

export default StudentLatestNoteCard;
