import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Film, Upload, X } from 'lucide-react';
import { uploadExerciseVideo } from '../../api/exerciseVideos';
import { t } from '../../i18n';

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_BYTES = 100 * 1024 * 1024;
const EXTENSION_TYPES = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' };

// Content type of a picked file; some browsers leave `file.type` empty, so the extension decides then.
const resolveContentType = (file) => {
  if (file.type) return file.type;
  return EXTENSION_TYPES[file.name?.split('.').pop()?.toLowerCase()] ?? '';
};

// Client-side check mirroring the API contract; returns an error message or null.
const validateFile = (file) => {
  if (!ACCEPTED_TYPES.includes(resolveContentType(file))) return t('exerciseVideo.invalidType');
  if (file.size > MAX_BYTES) return t('exerciseVideo.tooLarge');
  if (file.size <= 0) return t('exerciseVideo.failed');
  return null;
};

/**
 * Gallery video upload field with progress, cancel, native preview and removal.
 * @param {object} props - `onChange(key, previewUrl)` fires after the upload on pick, `onChange(null, null)` on removal; `previewClassName` is the host slot (`video-hero-stage`, `video-field-preview`) wrapping the preview
 */
const VideoFileUpload = ({ value = null, previewUrl = null, onChange, onUploadingChange, disabled = false, previewClassName = 'video-upload__preview' }) => {
  const inputRef = useRef(null);
  const controllerRef = useRef(null);
  const uploadingChangeRef = useRef(onUploadingChange);
  const createdUrlsRef = useRef(new Set());
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const uploading = progress !== null;

  useEffect(() => {
    uploadingChangeRef.current = onUploadingChange;
  });

  useEffect(() => () => {
    if (!controllerRef.current) return;
    controllerRef.current.abort();
    controllerRef.current = null;
    uploadingChangeRef.current?.(false);
  }, []);

  useEffect(() => {
    createdUrlsRef.current.forEach((url) => {
      if (url === previewUrl) return;
      URL.revokeObjectURL(url);
      createdUrlsRef.current.delete(url);
    });
  }, [previewUrl]);

  useEffect(() => {
    const created = createdUrlsRef.current;
    return () => {
      created.forEach((url) => URL.revokeObjectURL(url));
      created.clear();
    };
  }, []);

  const finishUpload = () => {
    controllerRef.current = null;
    setProgress(null);
    uploadingChangeRef.current?.(false);
  };

  const startUpload = async (file) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setProgress(0);
    uploadingChangeRef.current?.(true);
    try {
      const { key } = await uploadExerciseVideo(file, { onProgress: setProgress, signal: controller.signal, contentType: resolveContentType(file) });
      if (controller.signal.aborted) return;
      finishUpload();
      const localUrl = URL.createObjectURL(file);
      createdUrlsRef.current.add(localUrl);
      onChange(key, localUrl);
    } catch (uploadError) {
      if (controller.signal.aborted) return;
      finishUpload();
      setError(uploadError.userMessage || t('exerciseVideo.failed'));
    }
  };

  const handlePick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const invalid = validateFile(file);
    setError(invalid);
    if (!invalid) startUpload(file);
  };

  const handleCancel = () => {
    controllerRef.current?.abort();
    finishUpload();
  };

  const handleRemove = () => {
    setError(null);
    onChange(null, null);
  };

  return (
    <div className="video-upload">
      {value && (
        <div className={previewClassName}>
          {previewUrl ? (
            <video className="video-upload__player" src={previewUrl} controls playsInline preload="metadata" aria-label={t('exerciseVideo.preview')} />
          ) : (
            <p className="video-upload__placeholder type-body">
              <Film size={24} strokeWidth={2} aria-hidden="true" />
              {t('exerciseVideo.attached')}
            </p>
          )}
        </div>
      )}

      <div className="video-upload__actions">
        {!value && (
          <>
            <button type="button" className="btn btn--secondary" disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>
              <Upload size={16} strokeWidth={2} aria-hidden="true" />
              {t('exerciseVideo.upload')}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="visually-hidden"
              tabIndex={-1}
              aria-label={t('exerciseVideo.inputLabel')}
              disabled={disabled || uploading}
              onChange={handlePick}
            />
          </>
        )}
        {value && !disabled && (
          <button type="button" className="btn btn--ghost" onClick={handleRemove}>
            <X size={16} strokeWidth={2} aria-hidden="true" />
            {t('exerciseVideo.remove')}
          </button>
        )}
        {uploading && (
          <button type="button" className="btn btn--ghost" onClick={handleCancel}>
            <X size={16} strokeWidth={2} aria-hidden="true" />
            {t('exerciseVideo.cancel')}
          </button>
        )}
      </div>

      {uploading && (
        <div className="video-upload__progress">
          <div className="video-upload__bar" role="progressbar" aria-label={t('exerciseVideo.progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="video-upload__bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="video-upload__percent type-caption">{t('exerciseVideo.uploading')} {progress}%</span>
        </div>
      )}

      {!value && !uploading && !error && <span className="field-hint type-caption">{t('exerciseVideo.hint')}</span>}
      {error && <span className="field-error type-caption" role="alert">{error}</span>}
    </div>
  );
};

VideoFileUpload.propTypes = {
  /** Storage key of the uploaded video (`videoFileKey`). */
  value: PropTypes.string,
  /** Playable URL for the preview: a signed GET URL or a local object URL. */
  previewUrl: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onUploadingChange: PropTypes.func,
  disabled: PropTypes.bool,
  previewClassName: PropTypes.string,
};

export default VideoFileUpload;
