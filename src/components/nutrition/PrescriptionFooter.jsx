import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { PRESCRIPTION_STEPS } from '../../constants/prescriptionSteps';

const DEFAULT_SAVE_TEXT = 'As alterações são salvas automaticamente.';

// Neighbour steps of the current one (null at the ends).
const neighbours = (step) => {
  const index = PRESCRIPTION_STEPS.findIndex((candidate) => candidate.id === step);
  return { previous: PRESCRIPTION_STEPS[index - 1] ?? null, next: PRESCRIPTION_STEPS[index + 1] ?? null };
};

// Sticky bar of the prescription: save status on the left, back/next (and the extra action) on the right.
const PrescriptionFooter = ({ step, basePath, saveStatusText, saveFailed, onRetrySave, onLinkClick, extra }) => {
  const { previous, next } = neighbours(step);
  return (
    <div className="prescription-footer">
      <p className="prescription-footer__status" role="status" aria-live="polite">
        <Clock size={18} strokeWidth={2} aria-hidden="true" />
        <span>{saveStatusText || DEFAULT_SAVE_TEXT}</span>
        {saveFailed && onRetrySave && (
          <button type="button" className="prescription-footer__retry" onClick={onRetrySave}>Tentar novamente</button>
        )}
      </p>
      <div className="prescription-footer__actions">
        {previous && (
          <Link to={`${basePath}/${previous.id}`} className="btn btn--secondary prescription-footer__button" onClick={onLinkClick(`${basePath}/${previous.id}`)}>
            <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            {previous.short}
          </Link>
        )}
        {extra}
        {next && (
          <Link to={`${basePath}/${next.id}`} className="btn btn--primary prescription-footer__button" onClick={onLinkClick(`${basePath}/${next.id}`)}>
            Próximo: {next.short}
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
};

PrescriptionFooter.propTypes = {
  step: PropTypes.oneOf(PRESCRIPTION_STEPS.map((candidate) => candidate.id)).isRequired,
  basePath: PropTypes.string.isRequired,
  saveStatusText: PropTypes.string,
  saveFailed: PropTypes.bool,
  onRetrySave: PropTypes.func,
  onLinkClick: PropTypes.func.isRequired,
  extra: PropTypes.node,
};

export default PrescriptionFooter;
