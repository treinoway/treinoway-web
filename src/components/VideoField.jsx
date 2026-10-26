import { useState } from 'react';
import PropTypes from 'prop-types';
import { Film, X } from 'lucide-react';
import VideoLibraryPicker from './VideoLibraryPicker';
import { getYoutubeVideoId } from '../utils/youtube';
import { isHttpUrl } from '../utils/gif';

/**
 * VideoField — shared video input for ExerciseForm and ExerciseComposer.
 *
 * States:
 *   - Empty: CTA "Escolher da biblioteca" + link to reveal URL input
 *   - Valid YouTube URL: 16:9 iframe preview + Trocar / Remover actions
 *   - Non-YouTube URL typed: URL input visible + hint (non-blocking)
 *   - GIF link (optional): 16:9 image preview when there is no valid video
 */
const VideoField = ({ value, onChange, gifValue = '', onGifChange, label = 'Vídeo de demonstração', canUseLibrary = false, gifError = null }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [failedGif, setFailedGif] = useState(null);
  const [urlInputVisible, setUrlInputVisible] = useState(!canUseLibrary);

  const trimmedValue = value?.trim() ?? '';
  const youtubeId = getYoutubeVideoId(trimmedValue);
  const hasValidVideo = Boolean(youtubeId);
  const hasInvalidUrl = trimmedValue.length > 0 && !hasValidVideo;
  const trimmedGif = gifValue?.trim() ?? '';
  const showGifPreview = !hasValidVideo && isHttpUrl(trimmedGif);
  const hasInvalidGif = trimmedGif.length > 0 && !isHttpUrl(trimmedGif);

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

      {showGifPreview && (
        <div className="video-field-preview">
          {failedGif === trimmedGif ? (
            <p className="gif-fallback type-caption">Não foi possível carregar o GIF</p>
          ) : (
            <img className="video-field-gif" src={trimmedGif} alt="Prévia do GIF" onError={() => setFailedGif(trimmedGif)} />
          )}
        </div>
      )}

      {onGifChange && (
        <div className="video-field-input-wrap">
          <input
            type="url"
            className="input"
            placeholder="https://.../exercicio.gif"
            value={gifValue ?? ''}
            onChange={(e) => onGifChange(e.target.value)}
            aria-label="Link do GIF"
          />
          {gifError && <span className="field-error type-caption" role="alert">{gifError}</span>}
          {hasInvalidGif && !gifError && (
            <p className="video-field-hint type-caption" role="status">
              Use um link http(s) para pré-visualizar o GIF.
            </p>
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
  gifValue: PropTypes.string,
  onGifChange: PropTypes.func,
  label: PropTypes.string,
  /** Library picker is admin-only; everyone else pastes a YouTube link. */
  canUseLibrary: PropTypes.bool,
  gifError: PropTypes.string,
};

export default VideoField;
