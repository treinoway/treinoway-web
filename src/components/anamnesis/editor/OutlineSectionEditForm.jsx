import { useState } from 'react';
import PropTypes from 'prop-types';

const OutlineSectionEditForm = ({ section, onSubmit, onCancel }) => {
  const [title, setTitle] = useState(section.title);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const ok = await onSubmit(section.id, { title, description: section.description ?? '' });
    setSaving(false);
    if (ok) onCancel();
  };

  return (
    <form className="outline-section-edit" onSubmit={handleSubmit}>
      <input
        type="text"
        className="input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Título da seção"
        required
        disabled={saving}
      />
      <div className="ds-actions">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
};

OutlineSectionEditForm.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default OutlineSectionEditForm;
