import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import SkeletonText from './ds/SkeletonText';
import { getTranslations } from '../i18n';

const ROTATION_INTERVAL_MS = 2500;

// Picks a random index different from the excluded one.
const pickRandomIndex = (length, excludeIndex = -1) => {
  if (length <= 1) return 0;
  let next;
  do {
    next = Math.floor(Math.random() * length);
  } while (next === excludeIndex);
  return next;
};

// Visual placeholder for a reply being generated; the page-level live region announces the progress.
const StreamingSkeleton = ({ statusMessage = '' }) => {
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
    <div className="streaming-skeleton" aria-hidden="true">
      <SkeletonText typeClass="type-body" width="long" />
      <SkeletonText typeClass="type-body" width="medium" />
      <SkeletonText typeClass="type-body" width="short" />
      <p className="type-caption streaming-skeleton__status" key={displayStatus}>
        {displayStatus}
      </p>
    </div>
  );
};

StreamingSkeleton.propTypes = {
  statusMessage: PropTypes.string,
};

export default StreamingSkeleton;
