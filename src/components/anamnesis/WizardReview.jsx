import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';

const DEFAULT_HINT = 'Confira suas respostas antes de enviar.';

const formatPending = (count) => (count === 1 ? '1 pendência' : `${count} pendências`);

const ReviewItem = ({ item, onEdit }) => {
  const hasPending = item.pending > 0;
  return (
    <li className={`anamnesis-review-item${hasPending ? ' anamnesis-review-item--error' : ''}`}>
      <div className="anamnesis-review-info">
        <span className="anamnesis-review-title">{item.title}</span>
        <span className="text-sm text-muted">{item.answered} de {item.total} respondidas</span>
        {hasPending && (
          <span className="anamnesis-review-alert">
            <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
            {formatPending(item.pending)}
          </span>
        )}
      </div>
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={() => onEdit(item.stepIndex)}
        aria-label={`${hasPending ? 'Corrigir' : 'Editar'} ${item.title}`}
      >
        {hasPending ? 'Corrigir' : 'Editar'}
      </button>
    </li>
  );
};

const WizardReview = ({ summaries, onEdit, hint = DEFAULT_HINT }) => (
  <div className="anamnesis-review">
    <p className="text-sm text-muted">{hint}</p>
    <ul className="anamnesis-review-list">
      {summaries.map((item) => (
        <ReviewItem key={item.id} item={item} onEdit={onEdit} />
      ))}
    </ul>
  </div>
);

const summaryShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  stepIndex: PropTypes.number.isRequired,
  answered: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  pending: PropTypes.number.isRequired,
});

ReviewItem.propTypes = {
  item: summaryShape.isRequired,
  onEdit: PropTypes.func.isRequired,
};

WizardReview.propTypes = {
  summaries: PropTypes.arrayOf(summaryShape).isRequired,
  onEdit: PropTypes.func.isRequired,
  hint: PropTypes.string,
};

export default WizardReview;
