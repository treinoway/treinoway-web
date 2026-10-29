import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CirclePlay, Play } from 'lucide-react';
import { t, translateError } from '../../i18n';
import { listTutorials } from '../../api/tutorials';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import EmptyBlock from '../../components/ds/EmptyBlock';
import QueryFeedback from '../../components/admin/QueryFeedback';
import TutorialPlayer from '../../components/tutorials/TutorialPlayer';
import { getTutorialPlayback, formatDuration } from '../../utils/tutorialMedia';

const SOURCE_LABEL_KEY = { youtube: 'tutorials.sourceYoutube', file: 'tutorials.sourceVideo', external: 'tutorials.sourceLink' };

// Clickable card: thumbnail (YouTube or first video frame) with play button, title, description and source badge.
const TutorialCard = ({ tutorial, onOpen }) => {
  const { kind, thumbnailUrl, url } = getTutorialPlayback(tutorial);
  const [videoFailed, setVideoFailed] = useState(false);
  const [duration, setDuration] = useState(null);
  const showVideoFrame = kind === 'file' && !videoFailed;
  const durationLabel = showVideoFrame ? formatDuration(duration) : null;
  return (
    <button type="button" className="tutorial-card" onClick={() => onOpen(tutorial)}>
      <span className="tutorial-card__thumb" aria-hidden="true">
        {thumbnailUrl && <img src={thumbnailUrl} alt="" loading="lazy" />}
        {showVideoFrame && (
          <video
            src={`${url}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            tabIndex={-1}
            aria-hidden="true"
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onError={() => setVideoFailed(true)}
          />
        )}
        <span className="tutorial-card__play"><Play size={24} strokeWidth={2} /></span>
        {durationLabel && <span className="tutorial-card__duration type-caption-strong">{durationLabel}</span>}
      </span>
      <span className="tutorial-card__body">
        <span className="tutorial-card__title type-h4">{tutorial.title}</span>
        {tutorial.description && <span className="tutorial-card__description type-body">{tutorial.description}</span>}
        <span className="tutorial-card__meta">
          <span className="badge badge--tag badge--neutral">{t(SOURCE_LABEL_KEY[kind])}</span>
        </span>
      </span>
    </button>
  );
};

TutorialCard.propTypes = {
  tutorial: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
};

// Loads the tutorials list; exposes items, loading, error message and reload.
const useTutorialsList = () => {
  const [state, setState] = useState({ items: [], loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listTutorials()
      .then((data) => !cancelled && setState({ items: data.items ?? [], loading: false, error: null }))
      .catch((loadError) => {
        if (!cancelled) setState({ items: [], loading: false, error: loadError.userMessage || translateError(loadError) });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setState((previous) => ({ ...previous, loading: true, error: null }));
    setReloadKey((key) => key + 1);
  }, []);

  return { ...state, reload };
};

// Trainer page "Como usar": grid of tutorial videos.
const Tutorials = () => {
  const { items: tutorials, loading, error, reload } = useTutorialsList();
  const [selected, setSelected] = useState(null);

  const hasRows = tutorials.length > 0;
  const isEmpty = !loading && !error && !hasRows;

  return (
    <div className="admin-page">
      <div className="tutorials-intro">
        <LibraryPageHeader icon={CirclePlay} title={t('tutorials.title')} />
        <p className="tutorials-intro__subtitle type-body">{t('tutorials.subtitle')}</p>
      </div>
      <QueryFeedback
        loading={loading && !hasRows}
        error={!!error}
        loadingLabel={t('tutorials.loading')}
        errorTitle={error || t('tutorials.errorTitle')}
        retryLabel={t('tutorials.retry')}
        onRetry={reload}
      />
      {isEmpty && (
        <EmptyBlock icon={CirclePlay} title={t('tutorials.emptyTitle')} description={t('tutorials.emptyDescription')} />
      )}
      {!error && hasRows && (
        <div className="grid-cards tutorials-grid">
          {tutorials.map((tutorial) => (
            <TutorialCard key={tutorial.id} tutorial={tutorial} onOpen={setSelected} />
          ))}
        </div>
      )}
      {selected && <TutorialPlayer tutorial={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default Tutorials;
