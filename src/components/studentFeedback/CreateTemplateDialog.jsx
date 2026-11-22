import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ConfirmDialog from '../ds/ConfirmDialog';
import Segmented from '../ds/Segmented';
import { FEEDBACK_TEMPLATE_LIMITS } from '../../constants/studentFeedback';
import { t } from '../../i18n';

const SOURCE = Object.freeze({ GENERAL: 'general', BLANK: 'blank' });
const NAME_INPUT_ID = 'feedback-create-template-name';

// Text of the create dialog under the `studentFeedback.templates.create` namespace
const tc = (key) => t(`studentFeedback.templates.create.${key}`);

// Starting points of a new template: a copy of the general one or a blank one
const sourceItems = () => [
  { id: SOURCE.GENERAL, label: tc('fromGeneral') },
  { id: SOURCE.BLANK, label: tc('blank') },
];

// Name of the new template; Enter confirms like the "Criar" button
const NameField = ({ inputRef, value, disabled, onChange, onSubmit }) => (
  <div className="field">
    <label className="field-label type-caption-strong" htmlFor={NAME_INPUT_ID}>{tc('nameLabel')}</label>
    <input
      ref={inputRef}
      id={NAME_INPUT_ID}
      type="text"
      className="input"
      value={value}
      maxLength={FEEDBACK_TEMPLATE_LIMITS.name}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => event.key === 'Enter' && onSubmit()}
    />
  </div>
);

NameField.propTypes = {
  inputRef: PropTypes.object.isRequired,
  value: PropTypes.string.isRequired,
  disabled: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

// Dialog that asks the name and the starting point of a new template; `onCreate` receives `{ name, sourceTemplateId }`, with no source for a blank one
const CreateTemplateDialog = ({ generalTemplateId, busy = false, onCreate, onCancel }) => {
  const [name, setName] = useState('');
  const [source, setSource] = useState(generalTemplateId ? SOURCE.GENERAL : SOURCE.BLANK);
  const nameRef = useRef(null);
  const trimmedName = name.trim();

  // why: the field is disabled while busy and loses focus; without it back, Escape no longer reaches the dialog after a failed create.
  useEffect(() => {
    if (!busy) nameRef.current?.focus();
  }, [busy]);

  const handleConfirm = () => {
    if (busy || !trimmedName) return;
    onCreate({ name: trimmedName, sourceTemplateId: source === SOURCE.GENERAL ? generalTemplateId : undefined });
  };

  return (
    <ConfirmDialog
      message={tc('title')}
      confirmLabel={tc('confirm')}
      confirmTone="primary"
      busy={busy}
      busyLabel={tc('creating')}
      confirmDisabled={!trimmedName}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <div className="feedback-create-template">
        <NameField inputRef={nameRef} value={name} disabled={busy} onChange={setName} onSubmit={handleConfirm} />
        {generalTemplateId && (
          <div className="field">
            <span className="field-label type-caption-strong">{tc('sourceLabel')}</span>
            <Segmented ariaLabel={tc('sourceLabel')} items={sourceItems()} value={source} onChange={setSource} disabled={busy} wrap />
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
};

CreateTemplateDialog.propTypes = {
  generalTemplateId: PropTypes.string,
  busy: PropTypes.bool,
  onCreate: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default CreateTemplateDialog;
