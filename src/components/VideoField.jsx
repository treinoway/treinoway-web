import { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { getYoutubeVideoId } from '../utils/youtube';
import { isHttpUrl } from '../utils/gif';
import VideoFileUpload from './ds/VideoFileUpload';

/**
 * VideoField — shared video input for ExerciseForm and ExerciseComposer.
 *
 * States:
 *   - Empty: YouTube URL input always visible
 *   - Valid YouTube URL: 16:9 iframe preview + Remover action
 *   - Non-YouTube URL typed: URL input visible + hint (non-blocking)
 *   - GIF link (optional): 16:9 image preview when there is no valid video
 *   - Uploaded file (optional): native `<video>` preview; wins over the YouTube link and the GIF
 */
const VideoField = ({
  value, onChange, gifValue = '', onGifChange, label = 'Vídeo de demonstração', gifError = null,
  videoFileKey = null, videoFilePreviewUrl = null, onVideoFileChange, onUploadingChange, allowUpload = true,
}) => {
  const [failedGif, setFailedGif] = useState(null);

  const trimmedValue = value?.trim() ?? '';
  const youtubeId = getYoutubeVideoId(trimmedValue);
  const canUpload = allowUpload && Boolean(onVideoFileChange);
  const hasVideoFile = canUpload && Boolean(videoFileKey);
  const hasValidVideo = Boolean(youtubeId) && !hasVideoFile;
  const hasInvalidUrl = trimmedValue.length > 0 && !youtubeId;
  const trimmedGif = gifValue?.trim() ?? '';
  const showGifPreview = !youtubeId && !hasVideoFile && isHttpUrl(trimmedGif);
  const hasInvalidGif = trimmedGif.length > 0 && !isHttpUrl(trimmedGif);

  const handleRemove = () => {
    onChange('');
  };

  return (
    <section className="video-field">
      <span className="field-label type-caption-strong">{label}</span>

      {canUpload && (
        <VideoFileUpload
          value={videoFileKey}
          previewUrl={videoFilePreviewUrl}
          onChange={onVideoFileChange}
          onUploadingChange={onUploadingChange}
          previewClassName="video-field-preview"
        />
      )}

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
    </section>
  );
};

VideoField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  gifValue: PropTypes.string,
  onGifChange: PropTypes.func,
  label: PropTypes.string,
  gifError: PropTypes.string,
  /** Storage key of the uploaded video file. */
  videoFileKey: PropTypes.string,
  /** Playable URL for the uploaded video (signed URL or local object URL). */
  videoFilePreviewUrl: PropTypes.string,
  /** Called with `(key, previewUrl)` after an upload, `(null, null)` on removal. */
  onVideoFileChange: PropTypes.func,
  onUploadingChange: PropTypes.func,
  /** Set false to hide the gallery upload. */
  allowUpload: PropTypes.bool,
};

export default VideoField;
