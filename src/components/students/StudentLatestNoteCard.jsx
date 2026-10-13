import PropTypes from 'prop-types';
import { MessageSquareQuote } from 'lucide-react';
import SkeletonText from '../ds/SkeletonText';
import { formatLastWorkout } from '../../utils/studentRow';
import { td } from '../../utils/studentCockpit';

const NoteSkeleton = () => (
  <div className="note-card__figure" role="status" aria-label={td('loading.note')}>
    <SkeletonText typeClass="type-body-lg" width="long" />
    <SkeletonText typeClass="type-body-lg" />
    <SkeletonText typeClass="type-caption" width="short" />
  </div>
);

const NoteQuote = ({ session, studentName }) => {
  const when = formatLastWorkout(session.startedAt);
  const attribution = [studentName, when?.toLowerCase(), session.trainingName].filter(Boolean).join(' · ');
  return (
    <figure className="note-card__figure">
      <blockquote className="note-card__quote type-body-lg">“{session.noteText}”</blockquote>
      {attribution && <figcaption className="note-card__caption type-caption">{attribution}</figcaption>}
    </figure>
  );
};

NoteQuote.propTypes = {
  session: PropTypes.shape({ noteText: PropTypes.string, startedAt: PropTypes.string, trainingName: PropTypes.string }).isRequired,
  studentName: PropTypes.string,
};

const NoteBody = ({ session, studentName, loading }) => {
  if (loading) return <NoteSkeleton />;
  if (!session?.noteText) return <p className="cockpit-card__muted type-body">{td('note.empty')}</p>;
  return <NoteQuote session={session} studentName={studentName} />;
};

NoteBody.propTypes = { session: PropTypes.object, studentName: PropTypes.string, loading: PropTypes.bool };

/**
 * "Última observação do aluno": the note the student left on their most recent
 * session that has one (recent-sessions `noteText`). Always rendered — skeleton while
 * the sessions load, a short empty line without a note — so the training grid keeps
 * its two columns and never reflows after load.
 */
const StudentLatestNoteCard = ({ session, studentName, loading = false }) => (
  <section className="section-card cockpit-card note-card" aria-labelledby="student-note-heading">
    <h3 id="student-note-heading" className="cockpit-card__subtitle type-body">
      <MessageSquareQuote size={16} strokeWidth={2} aria-hidden="true" />
      {td('note.title')}
    </h3>
    <NoteBody session={session} studentName={studentName} loading={loading} />
  </section>
);

StudentLatestNoteCard.propTypes = {
  session: PropTypes.shape({
    noteText: PropTypes.string,
    startedAt: PropTypes.string,
    trainingName: PropTypes.string,
  }),
  studentName: PropTypes.string,
  loading: PropTypes.bool,
};

export default StudentLatestNoteCard;
