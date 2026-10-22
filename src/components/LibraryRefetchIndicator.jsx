import PropTypes from 'prop-types';
import { Loader } from 'lucide-react';
import useDelayedFlag from '../hooks/useDelayedFlag';

const REFETCH_INDICATOR_DELAY_MS = 250;

/**
 * Non-blocking "Buscando…" hint for list refetches (search, filter, "Ver mais").
 * Only appears after a short delay so fast responses never flash a spinner.
 */
const LibraryRefetchIndicator = ({ active }) => {
  const visible = useDelayedFlag(active, REFETCH_INDICATOR_DELAY_MS);
  if (!visible) return null;
  return (
    <div className="library-refetch-indicator" role="status" aria-live="polite">
      <Loader size={16} strokeWidth={2} aria-hidden="true" className="library-refetch-spinner" />
      <span>Buscando…</span>
    </div>
  );
};

LibraryRefetchIndicator.propTypes = {
  active: PropTypes.bool.isRequired,
};

export default LibraryRefetchIndicator;
