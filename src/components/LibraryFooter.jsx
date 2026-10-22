import PropTypes from 'prop-types';
import { ArrowRight } from 'lucide-react';

/**
 * LibraryFooter — "Mostrando X de Y" + "Ver mais" (same pattern as StudentsFooter).
 */
const LibraryFooter = ({ shown, total, noun, nounPlural, loading = false, onShowMore }) => (
  <div className="library-footer">
    <span className="library-footer__count type-caption" role="status">
      Mostrando {shown} de {total} {total === 1 ? noun : nounPlural}
    </span>
    {shown < total && (
      <button type="button" className="btn btn--ghost" onClick={onShowMore} disabled={loading}>
        {loading ? 'Carregando...' : 'Ver mais'}
        {!loading && <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />}
      </button>
    )}
  </div>
);

LibraryFooter.propTypes = {
  shown: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  noun: PropTypes.string.isRequired,
  nounPlural: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  onShowMore: PropTypes.func.isRequired,
};

export default LibraryFooter;
