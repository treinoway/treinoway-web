import { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';
import { t, tf, translateError } from '../../i18n';
import { ALLOWED_VIDEO_TYPES, isHttpUrl, validateVideoFile } from '../../utils/tutorialMedia';

const FORM_ID = 'tutorial-form';

// Upload progress bar (0-100).
const UploadProgress = ({ percent }) => (
  <div className="tutorial-progress">
    <span className="tutorial-progress__label type-caption">{t('adminTutorials.uploadProgress')}</span>
    <div
      className="tutorial-progress__track"
      role="progressbar"
      aria-label={t('adminTutorials.uploadProgress')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="tutorial-progress__bar" style={{ width: `${percent}%` }} />
    </div>
    <span className="tutorial-progress__value type-caption">{percent}%</span>
  </div>
);

UploadProgress.propTypes = { percent: PropTypes.number.isRequired };

// Radio pair choosing link vs upload.
const SourceChoice = ({ source, onChange, disabled }) => (
  <fieldset className="tutorial-source" disabled={disabled}>
    <legend className="field-label type-caption-strong">{t('adminTutorials.fieldVideoSource')}</legend>
    {['link', 'upload'].map((option) => (
      <label key={option} className="tutorial-source__option type-body">
        <input
          type="radio"
          name="tutorial-video-source"
          value={option}
          checked={source === option}
          onChange={() => onChange(option)}
        />
        {option === 'link' ? t('adminTutorials.sourceOptionLink') : t('adminTutorials.sourceOptionUpload')}
      </label>
    ))}
  </fieldset>
);

SourceChoice.propTypes = {
  source: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

// Returns the first validation error message of the form values, or ''.
const validateValues = ({ title, source, url, file }, hasUploadedVideo) => {
  if (!title.trim()) return { field: 'title', message: t('adminTutorials.errorTitleRequired') };
  if (source === 'link' && !isHttpUrl(url.trim())) return { field: 'video', message: t('adminTutorials.errorUrlInvalid') };
  if (source === 'upload' && !file && !hasUploadedVideo) return { field: 'video', message: t('adminTutorials.errorFileRequired') };
  if (source === 'upload' && file) {
    const fileError = validateVideoFile(file);
    if (fileError) return { field: 'video', message: t(fileError) };
  }
  return null;
};

// Initial form values from the tutorial being edited (or blank).
const buildInitialValues = (tutorial) => ({
  title: tutorial?.title ?? '',
  description: tutorial?.description ?? '',
  source: tutorial?.videoSource ?? 'link',
  url: tutorial?.videoSource === 'link' ? tutorial.videoUrl : '',
  file: null,
});

// Video input for the chosen source: link field or file picker.
const VideoField = ({ values, disabled, hasUploadedVideo, error, onChange }) => {
  if (values.source === 'link') {
    return (
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="tutorial-url">{t('adminTutorials.fieldVideoUrl')}</label>
        <input
          id="tutorial-url"
          type="text"
          inputMode="url"
          className={`input${error ? ' input--error' : ''}`}
          placeholder={t('adminTutorials.videoUrlPlaceholder')}
          value={values.url}
          disabled={disabled}
          onChange={(event) => onChange({ url: event.target.value })}
        />
      </div>
    );
  }
  return (
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="tutorial-file">{t('adminTutorials.fieldVideoFile')}</label>
      <input
        id="tutorial-file"
        type="file"
        accept={ALLOWED_VIDEO_TYPES.join(',')}
        className="input"
        disabled={disabled}
        onChange={(event) => onChange({ file: event.target.files?.[0] ?? null })}
      />
      {!error && <span className="field-hint type-caption">{t('adminTutorials.videoFileHint')}</span>}
      {hasUploadedVideo && !values.file && <span className="field-hint type-caption">{t('adminTutorials.keepCurrentVideo')}</span>}
      {values.file && <span className="field-hint type-caption">{tf('adminTutorials.selectedFile', { name: values.file.name })}</span>}
    </div>
  );
};

VideoField.propTypes = {
  values: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
  hasUploadedVideo: PropTypes.bool.isRequired,
  error: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

// Create/edit modal. `onSubmit(values, onProgress)` performs the API work and throws on failure.
const TutorialFormModal = ({ tutorial, onSubmit, onClose }) => {
  const [values, setValues] = useState(() => buildInitialValues(tutorial));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [percent, setPercent] = useState(0);
  const hasUploadedVideo = tutorial?.videoSource === 'upload';
  const isUploading = saving && values.source === 'upload' && !!values.file;

  const handleChange = (changes) => setValues((previous) => ({ ...previous, ...changes }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const validation = validateValues(values, hasUploadedVideo);
    setError(validation);
    if (validation) return;
    setSaving(true);
    setPercent(0);
    try {
      await onSubmit(values, setPercent);
    } catch (submitError) {
      setError({ field: 'form', message: submitError.userMessage || translateError(submitError) });
      setSaving(false);
    }
  };

  const footer = (
    <div className="ds-actions">
      <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>{t('adminTutorials.cancel')}</button>
      <button type="submit" form={FORM_ID} className="btn btn--primary" disabled={saving}>{t('adminTutorials.save')}</button>
    </div>
  );

  return (
    <Modal
      title={tutorial ? t('adminTutorials.editTutorial') : t('adminTutorials.newTutorial')}
      onClose={onClose}
      closeDisabled={saving}
      footer={footer}
    >
      <form id={FORM_ID} className="tutorial-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="tutorial-title">{t('adminTutorials.fieldTitle')}</label>
          <input
            id="tutorial-title"
            type="text"
            className={`input${error?.field === 'title' ? ' input--error' : ''}`}
            value={values.title}
            maxLength={120}
            disabled={saving}
            onChange={(event) => handleChange({ title: event.target.value })}
          />
          {error?.field === 'title' && <p className="field-error type-caption" role="alert">{error.message}</p>}
        </div>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="tutorial-description">{t('adminTutorials.fieldDescription')}</label>
          <textarea
            id="tutorial-description"
            className="input"
            value={values.description}
            maxLength={2000}
            disabled={saving}
            onChange={(event) => handleChange({ description: event.target.value })}
          />
        </div>
        <SourceChoice source={values.source} onChange={(source) => handleChange({ source })} disabled={saving} />
        <VideoField
          values={values}
          disabled={saving}
          hasUploadedVideo={hasUploadedVideo}
          error={error?.field === 'video'}
          onChange={handleChange}
        />
        {error?.field === 'video' && <p className="field-error type-caption" role="alert">{error.message}</p>}
        {isUploading && <UploadProgress percent={percent} />}
        {error?.field === 'form' && <p className="field-error type-caption" role="alert">{error.message}</p>}
      </form>
    </Modal>
  );
};

TutorialFormModal.propTypes = {
  tutorial: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TutorialFormModal;
