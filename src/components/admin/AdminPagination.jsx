import PropTypes from 'prop-types';
import { tf } from '../../i18n';

/** Previous/next bar for admin tables; renders nothing when there is a single page. */
const AdminPagination = ({ page, pageCount, onPageChange, i18nPrefix }) => {
  if (pageCount <= 1) return null;
  return (
    <div className="pagination-bar">
      <button type="button" className="btn btn--secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        {tf(`${i18nPrefix}.prev`)}
      </button>
      <span className="pagination-bar__status type-body">
        {tf(`${i18nPrefix}.pageStatus`, { page, total: pageCount })}
      </span>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
      >
        {tf(`${i18nPrefix}.next`)}
      </button>
    </div>
  );
};

AdminPagination.propTypes = {
  page: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  i18nPrefix: PropTypes.string.isRequired,
};

export default AdminPagination;
