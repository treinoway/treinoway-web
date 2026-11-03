import PropTypes from 'prop-types';
import { t, tf } from '../../i18n';

// Previous/next row; renders nothing when there is a single page.
const Pagination = ({ page, pageCount, onPageChange }) => {
  if (pageCount <= 1) return null;
  return (
    <div className="pagination-row">
      <button type="button" className="btn btn--secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        {t('manager.prev')}
      </button>
      <span className="type-body">{tf('manager.pageStatus', { page, total: pageCount })}</span>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
      >
        {t('manager.next')}
      </button>
    </div>
  );
};

Pagination.propTypes = {
  page: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

export default Pagination;
