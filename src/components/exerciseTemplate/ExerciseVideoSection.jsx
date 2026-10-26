import { useState } from 'react';
import PropTypes from 'prop-types';
import { Film, Play, X, Link } from 'lucide-react';
import { getYoutubeVideoId } from '../../utils/youtube';
import { isHttpUrl } from '../../utils/gif';

const VideoStage = ({ youtubeId, gifUrl, gifFailed, onGifError, thumbError, playing, canPickFromLibrary, onPlay, onThumbError }) => {
  if (youtubeId && !thumbError) {
    return (
      <div className="video-hero-stage" role="img" aria-label="Pré-visualização do vídeo de demonstração">
        {playing ? (
          <iframe
            className="video-hero-iframe"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title="Demonstração do exercício"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <img
              className="video-hero-thumb"
              src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
              alt="Miniatura do vídeo"
              loading="lazy"
              onError={onThumbError}
            />
            <button type="button" className="video-hero-play" onClick={onPlay} aria-label="Reproduzir prévia">
              <Play size={24} strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    );
  }

  if (gifUrl) {
    return (
      <div className="video-hero-stage">
        {gifFailed ? (
          <p className="gif-fallback type-caption">Não foi possível carregar o GIF</p>
        ) : (
          <img className="video-hero-thumb video-hero-thumb--contain" src={gifUrl} alt="Prévia do GIF" onError={onGifError} />
        )}
      </div>
    );
  }

  const hint = thumbError
    ? 'Vídeo indisponível. Verifique o link ou escolha outro vídeo.'
    : canPickFromLibrary
      ? 'Cole o link do YouTube abaixo ou escolha um vídeo da sua biblioteca.'
      : 'Cole o link do YouTube abaixo.';
  return (
    <div className="video-hero-stage video-hero-stage--empty">
      <span className="video-hero-empty-icon" aria-hidden="true">
        <Film size={24} strokeWidth={2} />
      </span>
      <p className="video-hero-empty-hint type-body">{hint}</p>
    </div>
  );
};

VideoStage.propTypes = {
  youtubeId: PropTypes.string,
  gifUrl: PropTypes.string,
  gifFailed: PropTypes.bool.isRequired,
  onGifError: PropTypes.func.isRequired,
  thumbError: PropTypes.bool.isRequired,
  playing: PropTypes.bool.isRequired,
  canPickFromLibrary: PropTypes.bool.isRequired,
  onPlay: PropTypes.func.isRequired,
  onThumbError: PropTypes.func.isRequired,
};

/** "Demonstração" section: 16:9 preview stage, YouTube URL field, library picker (only when `onPickFromLibrary` is given) and removal. */
const ExerciseVideoSection = ({ className, videoUrl, onVideoUrlChange, gifUrl = '', onGifUrlChange, gifError = null, onPickFromLibrary, onRemoveVideo }) => {
  const youtubeId = getYoutubeVideoId(videoUrl);
  const canPickFromLibrary = !!onPickFromLibrary;
  const previewGifUrl = isHttpUrl(gifUrl) ? gifUrl.trim() : null;
  const hasInvalidGifUrl = gifUrl.trim() !== '' && !previewGifUrl;
  const hasInvalidUrl = videoUrl.trim() !== '' && !youtubeId;
  const [failedGif, setFailedGif] = useState(null);
  // Playback state belongs to one video: a different id starts again as a plain thumbnail.
  const [playback, setPlayback] = useState({ videoId: null, playing: false, thumbError: false });
  const { playing, thumbError } = playback.videoId === youtubeId ? playback : { playing: false, thumbError: false };
  const updatePlayback = (changes) => setPlayback({ videoId: youtubeId, playing, thumbError, ...changes });

  return (
    <section className={className} aria-labelledby="exercise-video-heading">
      <h2 id="exercise-video-heading" className="editor-page__section-title type-h3">Demonstração</h2>
      <p className="editor-page__section-hint type-caption">Opcional. Aceita links do YouTube ou de GIF.</p>

      <div className="video-hero">
        <VideoStage
          youtubeId={youtubeId}
          gifUrl={previewGifUrl}
          gifFailed={failedGif === previewGifUrl}
          onGifError={() => setFailedGif(previewGifUrl)}
          thumbError={thumbError}
          playing={playing}
          canPickFromLibrary={canPickFromLibrary}
          onPlay={() => updatePlayback({ playing: true })}
          onThumbError={() => updatePlayback({ thumbError: true })}
        />

        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="exercise-video-url">URL do vídeo</label>
          <div className="input--search-wrap">
            <Link size={16} strokeWidth={2} aria-hidden="true" />
            <input
              id="exercise-video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => onVideoUrlChange(e.target.value)}
              className={`input input--search${hasInvalidUrl ? ' input--error' : ''}`}
              placeholder="https://youtube.com/..."
            />
          </div>
          {hasInvalidUrl && <span className="field-error type-caption" role="alert">Link de YouTube inválido</span>}
        </div>

        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="exercise-gif-url">Link do GIF</label>
          <div className="input--search-wrap">
            <Link size={16} strokeWidth={2} aria-hidden="true" />
            <input
              id="exercise-gif-url"
              type="url"
              value={gifUrl}
              onChange={(e) => onGifUrlChange(e.target.value)}
              className={`input input--search${gifError ? ' input--error' : ''}`}
              placeholder="https://.../exercicio.gif"
            />
          </div>
          {gifError && <span className="field-error type-caption" role="alert">{gifError}</span>}
          {hasInvalidGifUrl && !gifError && (
            <span className="field-hint type-caption" role="status">Use um link http(s) para pré-visualizar o GIF.</span>
          )}
          {previewGifUrl && youtubeId && (
            <span className="field-hint type-caption">O vídeo tem prioridade sobre o GIF.</span>
          )}
        </div>

        {(canPickFromLibrary || youtubeId) && (
          <div className="video-hero-actions">
            {canPickFromLibrary && (
              <button type="button" className="btn btn--ghost" onClick={onPickFromLibrary}>
                <Film size={16} strokeWidth={2} aria-hidden="true" />
                Escolher da biblioteca
              </button>
            )}
            {youtubeId && (
              <button type="button" className="btn btn--ghost" onClick={onRemoveVideo}>
                <X size={16} strokeWidth={2} aria-hidden="true" />
                Remover vídeo
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

ExerciseVideoSection.propTypes = {
  className: PropTypes.string.isRequired,
  videoUrl: PropTypes.string.isRequired,
  onVideoUrlChange: PropTypes.func.isRequired,
  gifUrl: PropTypes.string,
  onGifUrlChange: PropTypes.func,
  gifError: PropTypes.string,
  onPickFromLibrary: PropTypes.func,
  onRemoveVideo: PropTypes.func.isRequired,
};

export default ExerciseVideoSection;
