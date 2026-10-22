import PropTypes from 'prop-types';
import { CircleAlert } from 'lucide-react';
import EmptyBlock from './ds/EmptyBlock';
import LibraryList from './LibraryList';
import LibraryBatchBar from './LibraryBatchBar';
import LibraryFooter from './LibraryFooter';
import LibraryRefetchIndicator from './LibraryRefetchIndicator';

/**
 * LibraryListView — body of a Biblioteca list page, below the page header.
 * Resolves the mutually exclusive states in order: initial loading, load error,
 * empty library (with CTA), then toolbar + batch bar + list + footer.
 *
 * Props:
 *  - status ('loading' | 'ready' | 'error'), loadError, errorTitle, onRetry
 *  - isEmptyLibrary + empty ({ icon, title, description, actionLabel, onAction })
 *  - toolbar (node)            — usually a LibraryFilterBar
 *  - refetching (bool)         — shows the delayed non-blocking indicator
 *  - batch (object | null)     — LibraryBatchBar props; pass null when no row is selectable
 *  - isNoResults, noResultsMessage
 *  - footer (object | null)    — LibraryFooter props; hidden while total is 0
 *  - children                  — LibraryListRow elements
 */
const LibraryListView = ({
  status,
  loadError,
  errorTitle,
  onRetry,
  isEmptyLibrary = false,
  empty,
  toolbar,
  refetching = false,
  batch = null,
  isNoResults = false,
  noResultsMessage,
  footer = null,
  children,
}) => {
  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <EmptyBlock
        icon={CircleAlert}
        role="alert"
        title={errorTitle}
        description={loadError}
        actionLabel="Tentar novamente"
        onAction={onRetry}
      />
    );
  }

  if (isEmptyLibrary) return <EmptyBlock {...empty} />;

  return (
    <>
      {toolbar}
      <LibraryRefetchIndicator active={refetching} />
      {batch && <LibraryBatchBar {...batch} />}
      <LibraryList emptyMessage={noResultsMessage} isNoResults={isNoResults}>
        {children}
      </LibraryList>
      {footer && footer.total > 0 && <LibraryFooter {...footer} />}
    </>
  );
};

LibraryListView.propTypes = {
  status: PropTypes.oneOf(['loading', 'ready', 'error']).isRequired,
  loadError: PropTypes.string,
  errorTitle: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
  isEmptyLibrary: PropTypes.bool,
  empty: PropTypes.shape({
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    actionLabel: PropTypes.string,
    onAction: PropTypes.func,
  }).isRequired,
  toolbar: PropTypes.node,
  refetching: PropTypes.bool,
  batch: PropTypes.object,
  isNoResults: PropTypes.bool,
  noResultsMessage: PropTypes.string,
  footer: PropTypes.object,
  children: PropTypes.node,
};

export default LibraryListView;
