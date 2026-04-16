import { useState } from 'react';
import PropTypes from 'prop-types';
import { Info, X } from 'lucide-react';

const readDismissed = (storageKey) => {
  if (!storageKey) return false;
  try {
    return localStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
};

const persistDismissed = (storageKey) => {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, '1');
  } catch {
    // storage unavailable; banner will simply reappear next render
  }
};

/**
 * Dismissible educational banner. Once dismissed, the banner stays hidden
 * for the current browser via localStorage keyed by `storageKey`.
 */
const OneTimeBanner = ({ storageKey, text, dismissLabel = 'Fechar aviso' }) => {
  const [dismissed, setDismissed] = useState(() => readDismissed(storageKey));

  if (dismissed) return null;

  const handleDismiss = () => {
    persistDismissed(storageKey);
    setDismissed(true);
  };

  return (
    <div className="one-time-banner" role="note">
      <Info size={16} strokeWidth={2} className="one-time-banner__icon" />
      <span className="one-time-banner__text">{text}</span>
      <button
        type="button"
        className="one-time-banner__dismiss"
        onClick={handleDismiss}
        aria-label={dismissLabel}
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
};

OneTimeBanner.propTypes = {
  storageKey: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  dismissLabel: PropTypes.string,
};

export default OneTimeBanner;
