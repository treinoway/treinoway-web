import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getTranslations } from '../i18n';

const ROTATION_INTERVAL_MS = 2500;

const pickRandomIndex = (length, excludeIndex = -1) => {
  if (length <= 1) return 0;
  let next;
  do {
    next = Math.floor(Math.random() * length);
  } while (next === excludeIndex);
  return next;
};

const StreamingSkeleton = ({ statusMessage }) => {
  const translations = getTranslations();
  const phrases = translations.iArnold?.skeleton?.phrases ?? [];
  const fallback = translations.iArnold?.skeleton?.thinking ?? 'Pensando…';

  const [phraseIndex, setPhraseIndex] = useState(() =>
    phrases.length > 0 ? pickRandomIndex(phrases.length) : 0
  );

  useEffect(() => {
    if (statusMessage || phrases.length === 0) return;

    const id = setInterval(() => {
      setPhraseIndex((prev) => pickRandomIndex(phrases.length, prev));
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(id);
  }, [statusMessage, phrases.length]);

  const displayStatus = statusMessage || (phrases.length > 0 ? phrases[phraseIndex] : fallback);

  return (
    <div
      className="streaming-skeleton"
      role="status"
      aria-live="polite"
      aria-label="iArnold está processando sua pergunta"
    >
      <div className="streaming-skeleton__bars" aria-hidden="true">
        <div className="streaming-skeleton__bar streaming-skeleton__bar--w-90" />
        <div className="streaming-skeleton__bar streaming-skeleton__bar--w-75" />
        <div className="streaming-skeleton__bar streaming-skeleton__bar--w-60" />
      </div>
      <div className="streaming-skeleton__status">
        <span className="streaming-skeleton__dot" aria-hidden="true" />
        <span className="streaming-skeleton__status-text" key={displayStatus}>
          {displayStatus}
        </span>
      </div>
    </div>
  );
};

StreamingSkeleton.propTypes = {
  statusMessage: PropTypes.string,
};

StreamingSkeleton.defaultProps = {
  statusMessage: '',
};

export default StreamingSkeleton;
