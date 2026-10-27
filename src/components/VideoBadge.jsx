import PropTypes from 'prop-types';
import { Play } from 'lucide-react';
import { t } from '../i18n';
import { hasDemoMedia } from '../utils/demoMedia';

// Neutral "Vídeo" pill shown in exercise row meta lines when the exercise has a demo video or GIF; nothing otherwise.
const VideoBadge = ({ exercise }) => {
  if (!hasDemoMedia(exercise)) return null;
  const label = t('videoBadge.title');
  return (
    <span className="technique-chips">
      <span className="technique-chip technique-chip--neutral" role="img" aria-label={label} title={label}>
        <Play size={12} strokeWidth={2} aria-hidden="true" />
        {t('videoBadge.label')}
      </span>
    </span>
  );
};

VideoBadge.propTypes = {
  exercise: PropTypes.shape({ videoUrl: PropTypes.string, gifUrl: PropTypes.string }),
};

export default VideoBadge;
