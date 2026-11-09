import { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';

const FORM_ID = 'add-meal-form';
const TIP_LIMIT = 500;

// Modal that creates or edits a meal (name, time and an optional tip for the patient).
const AddMealModal = ({ meal, submitting, onClose, onSubmit }) => {
  const isEditing = Boolean(meal);
  const [values, setValues] = useState({ name: meal?.name ?? '', time: meal?.time ?? '', tip: meal?.tip ?? '' });
  const setField = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }));
  const canSubmit = Boolean(values.name.trim() && values.time);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    const tip = values.tip.trim();
    // why: PATCH needs an explicit null to clear a tip; POST just omits it.
    const tipField = isEditing ? { tip: tip || null } : (tip ? { tip } : {});
    onSubmit({ name: values.name.trim(), time: values.time, ...tipField });
  };

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>Cancelar</button>
      <button type="submit" form={FORM_ID} className="btn btn--primary" disabled={submitting || !canSubmit}>
        {submitting ? (isEditing ? 'Salvando…' : 'Adicionando…') : (isEditing ? 'Salvar' : 'Adicionar')}
      </button>
    </>
  );

  return (
    <Modal title={isEditing ? 'Editar refeição' : 'Adicionar refeição'} onClose={onClose} footer={footer} closeDisabled={submitting}>
      <form id={FORM_ID} className="my-food-form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="meal-name">Nome da refeição</label>
          <input id="meal-name" className="input" value={values.name} onChange={setField('name')} disabled={submitting} autoFocus />
        </div>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="meal-time">Horário</label>
          <input id="meal-time" type="time" className="input" value={values.time} onChange={setField('time')} disabled={submitting} />
        </div>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor="meal-tip">Dica para o paciente (opcional)</label>
          <textarea id="meal-tip" className="input" maxLength={TIP_LIMIT} value={values.tip} onChange={setField('tip')} disabled={submitting} />
        </div>
      </form>
    </Modal>
  );
};

AddMealModal.propTypes = {
  meal: PropTypes.shape({ name: PropTypes.string, time: PropTypes.string, tip: PropTypes.string }),
  submitting: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default AddMealModal;
