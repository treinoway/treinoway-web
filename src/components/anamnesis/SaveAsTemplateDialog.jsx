import { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';

const NAME_MAX_LENGTH = 200;
const NAME_REQUIRED_MESSAGE = 'Informe um nome para o modelo.';
const INPUT_ID = 'save-as-template-name';
const ERROR_ID = 'save-as-template-name-error';

/**
 * "Salvar como modelo" dialog: asks for the copy's name (pre-filled
 * "Cópia de {título}") and hands the trimmed name to `onSubmit`. The page does
 * the request; `saving` locks the dialog while it runs.
 */
const SaveAsTemplateDialog = ({ anamnesisTitle, saving = false, onSubmit, onCancel }) => {
  const [name, setName] = useState(`Cópia de ${anamnesisTitle}`);
  const [error, setError] = useState(null);

  const handleCancel = () => {
    if (!saving) onCancel();
  };

  const handleNameChange = (event) => {
    setName(event.target.value);
    if (error) setError(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(NAME_REQUIRED_MESSAGE);
      return;
    }
    onSubmit(trimmedName);
  };

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={handleCancel} disabled={saving}>
        Cancelar
      </button>
      <button type="submit" form="save-as-template-form" className="btn btn--primary" disabled={saving}>
        {saving ? 'Carregando...' : 'Salvar'}
      </button>
    </>
  );

  return (
    <Modal title="Salvar como modelo" onClose={handleCancel} closeDisabled={saving} footer={footer}>
      <form id="save-as-template-form" className="field" onSubmit={handleSubmit} noValidate>
        <label className="field-label type-caption-strong" htmlFor={INPUT_ID}>
          Nome do modelo <span aria-hidden="true">*</span>
        </label>
        <input
          id={INPUT_ID}
          className={`input${error ? ' input--error' : ''}`}
          value={name}
          onChange={handleNameChange}
          maxLength={NAME_MAX_LENGTH}
          disabled={saving}
          aria-required="true"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? ERROR_ID : undefined}
          autoComplete="off"
          autoFocus
        />
        {error && (
          <span id={ERROR_ID} className="field-error type-caption" role="alert">{error}</span>
        )}
        <span className="field-hint type-caption">
          A cópia é sua e aparece na lista. A anamnese original não muda.
        </span>
      </form>
    </Modal>
  );
};

SaveAsTemplateDialog.propTypes = {
  anamnesisTitle: PropTypes.string.isRequired,
  saving: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default SaveAsTemplateDialog;
