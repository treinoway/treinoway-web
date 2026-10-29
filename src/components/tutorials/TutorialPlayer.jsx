import PropTypes from 'prop-types';
import { ExternalLink } from 'lucide-react';
import Modal from '../ds/Modal';
import { t } from '../../i18n';
import { getTutorialPlayback } from '../../utils/tutorialMedia';

// Renders the right player for a playback descriptor.
const PlayerStage = ({ playback, title }) => {
  if (playback.kind === 'youtube') {
    return (
      <div className="tutorial-player">
        <iframe
          src={playback.embedUrl}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (playback.kind === 'file') {
    return (
      <div className="tutorial-player">
        <video src={playback.url} controls preload="metadata" />
      </div>
    );
  }
  return (
    <a className="btn btn--primary" href={playback.url} target="_blank" rel="noopener noreferrer">
      <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
      {t('tutorials.openVideo')}
    </a>
  );
};

PlayerStage.propTypes = {
  playback: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
};

// Modal that plays a tutorial video (YouTube embed, native video or external link).
const TutorialPlayer = ({ tutorial, onClose }) => (
  <Modal title={tutorial.title} onClose={onClose} wide>
    <div className="tutorial-player-body">
      <PlayerStage playback={getTutorialPlayback(tutorial)} title={tutorial.title} />
      {tutorial.description && <p className="type-body tutorial-player-body__description">{tutorial.description}</p>}
    </div>
  </Modal>
);

TutorialPlayer.propTypes = {
  tutorial: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    videoSource: PropTypes.string.isRequired,
    videoUrl: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TutorialPlayer;
