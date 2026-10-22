import { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';

const FORM_ID = 'anamnesis-form';
const TITLE_REQUIRED_MESSAGE = 'Informe o nome da anamnese.';

/**
 * Create / edit the metadata (name + description) of an anamnesis.
 * The parent owns the request: `onSubmit({ title, description })` may be async
 * and `saving` locks the form while it runs. Pass `anamnesis` to edit.
 */
const AnamnesisFormModal = ({ anamnesis = null, saving = false, onClose, onSubmit }) => {
  const isEditing = !!anamnesis;
  const [title, setTitle] = useState(anamnesis?.title ?? '');
  const [description, setDescription] = useState(anamnesis?.description ?? '');
  const [titleError, setTitleError] = useState('');

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    if (titleError) setTitleError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(TITLE_REQUIRED_MESSAGE);
      return;
    }
    onSubmit({ title: trimmedTitle, description: description.trim() });
  };

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
        Cancelar
      </button>
      <button type="submit" form={FORM_ID} className="btn btn--primary" disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
    </>
  );

  return (
    <Modal
      title={isEditing ? 'Editar anamnese' : 'Nova anamnese'}
      onClose={onClose}
      closeDisabled={saving}
      footer={footer}
    >
      <form id={FORM_ID} className="stack-md" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="anamnesis-title">Nome</label>
          <input
            id="anamnesis-title"
            type="text"
            className={`input${titleError ? ' input--error' : ''}`}
            value={title}
            onChange={handleTitleChange}
            placeholder="Ex: Anamnese inicial"
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? 'anamnesis-title-error' : undefined}
            disabled={saving}
            autoFocus
          />
          {titleError && (
            <span id="anamnesis-title-error" className="field-error type-caption" role="alert">
              {titleError}
            </span>
          )}
        </div>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="anamnesis-description">Descrição</label>
          <textarea
            id="anamnesis-description"
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional"
            disabled={saving}
          />
          {!isEditing && (
            <span className="field-hint type-caption">
              Após salvar, você poderá adicionar seções e perguntas à anamnese.
            </span>
          )}
        </div>
      </form>
    </Modal>
  );
};

AnamnesisFormModal.propTypes = {
  anamnesis: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
  }),
  saving: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default AnamnesisFormModal;
