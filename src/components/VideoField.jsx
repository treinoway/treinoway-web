import { useState } from 'react';
import PropTypes from 'prop-types';
import { Film, X } from 'lucide-react';
import VideoLibraryPicker from './VideoLibraryPicker';
import { getYoutubeVideoId } from '../utils/youtube';

/**
 * VideoField — shared video input for ExerciseForm and ExerciseComposer.
 *
 * States:
 *   - Empty: CTA "Escolher da biblioteca" + link to reveal URL input
 *   - Valid YouTube URL: 16:9 iframe preview + Trocar / Remover actions
 *   - Non-YouTube URL typed: URL input visible + hint (non-blocking)
 */
const VideoField = ({ value, onChange, label = 'Vídeo de demonstração', canUseLibrary = false }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [urlInputVisible, setUrlInputVisible] = useState(!canUseLibrary);

  const trimmedValue = value?.trim() ?? '';
  const youtubeId = getYoutubeVideoId(trimmedValue);
  const hasValidVideo = Boolean(youtubeId);
  const hasInvalidUrl = trimmedValue.length > 0 && !hasValidVideo;

  const handleRemove = () => {
    onChange('');
    setUrlInputVisible(false);
  };

  const handlePickerSelect = (video) => {
    onChange(video.url);
    setPickerOpen(false);
    setUrlInputVisible(false);
  };

  return (
    <section className="video-field">
      <span className="field-label type-caption-strong">{label}</span>

      {hasValidVideo && (
        <>
          <div className="video-field-preview">
            <iframe
              loading="lazy"
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="Vídeo de demonstração do exercício"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="video-field-actions">
            {canUseLibrary && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setPickerOpen(true)}
              >
                <Film size={16} strokeWidth={2} aria-hidden="true" />
                Trocar
              </button>
            )}
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleRemove}
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
              Remover
            </button>
          </div>
        </>
      )}

      {!hasValidVideo && (
        <div className="video-field-empty">
          {canUseLibrary && (
            <button
              type="button"
              className="btn btn--primary video-field-cta"
              onClick={() => setPickerOpen(true)}
            >
              <Film size={16} strokeWidth={2} aria-hidden="true" />
              Escolher da biblioteca
            </button>
          )}

          {!urlInputVisible && (
            <button
              type="button"
              className="btn btn--ghost video-field-url-toggle"
              onClick={() => setUrlInputVisible(true)}
            >
              ou cole uma URL do YouTube
            </button>
          )}

          {urlInputVisible && (
            <div className="video-field-input-wrap">
              <input
                type="url"
                className="input"
                placeholder="https://youtube.com/watch?v=..."
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                aria-label="URL do YouTube"
              />
              {hasInvalidUrl && (
                <p className="video-field-hint type-caption" role="status">
                  Use um link do YouTube para pré-visualizar o vídeo.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {canUseLibrary && (
        <VideoLibraryPicker
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handlePickerSelect}
        />
      )}
    </section>
  );
};

VideoField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  /** Library picker is admin-only; everyone else pastes a YouTube link. */
  canUseLibrary: PropTypes.bool,
};

export default VideoField;
