import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Inbox } from 'lucide-react';
import Banner from '../../components/ds/Banner';
import EmptyBlock from '../../components/ds/EmptyBlock';
import SkeletonRows from '../../components/ds/SkeletonRows';
import useManagerQuery from '../useManagerQuery';
import Pagination from './Pagination';

const PAGE_SIZE = 20;

// Table plus pagination for one paged endpoint; handles loading, error and empty states.
const PagedTable = ({ fetchPage, columns, renderRow, emptyTitle, loadingLabel }) => {
  const [page, setPage] = useState(1);
  const request = useCallback(() => fetchPage({ page, pageSize: PAGE_SIZE }), [fetchPage, page]);
  const { data, message, loading } = useManagerQuery(request);

  if (loading) return <SkeletonRows label={loadingLabel} count={5} />;
  if (message) return <Banner tone="error">{message}</Banner>;
  if (!data.items.length) return <EmptyBlock icon={Inbox} title={emptyTitle} />;

  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  return (
    <>
      <div className="section-card admin-table-wrap">
        <table className="admin-table type-body">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`type-caption-strong ${column.className ?? ''}`.trim()}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{data.items.map(renderRow)}</tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </>
  );
};

PagedTable.propTypes = {
  fetchPage: PropTypes.func.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.string.isRequired, className: PropTypes.string })
  ).isRequired,
  renderRow: PropTypes.func.isRequired,
  emptyTitle: PropTypes.string.isRequired,
  loadingLabel: PropTypes.string.isRequired,
};

export default PagedTable;
