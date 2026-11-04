import { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';
import { SEX_LABEL } from '../../constants/nutrition';

const FORM_ID = 'edit-sheet-form';

// Initial form values from the sheet.
const toFormValues = (sheet) => ({
  sex: sheet.sex ?? '',
  weightKg: sheet.weightKg == null ? '' : String(sheet.weightKg),
  heightCm: sheet.heightCm == null ? '' : String(sheet.heightCm),
  bodyFatPct: sheet.bodyFatPct == null ? '' : String(sheet.bodyFatPct),
  assessedAt: sheet.assessedAt ?? '',
});

// Sheet body for PUT (the endpoint replaces the whole sheet).
const toBody = (values) => ({
  sex: values.sex,
  weightKg: Number(values.weightKg),
  heightCm: Number(values.heightCm),
  bodyFatPct: values.bodyFatPct === '' ? null : Number(values.bodyFatPct),
  assessedAt: values.assessedAt || null,
});

// Inline error per required field (sex, weight, height); empty object when valid.
const validate = (values) => {
  const errors = {};
  if (!values.sex) errors.sex = 'Selecione o sexo.';
  if (!(Number(values.weightKg) > 0)) errors.weightKg = 'Informe um peso maior que zero.';
  if (!(Number(values.heightCm) > 0)) errors.heightCm = 'Informe uma altura maior que zero.';
  return errors;
};

// Labelled input of the sheet form with its inline error.
const SheetField = ({ id, label, error, children }) => (
  <div className="field">
    <label className="field-label type-caption-strong" htmlFor={id}>{label}</label>
    {children}
    {error && <span id={`${id}-error`} className="form-error" role="alert">{error}</span>}
  </div>
);

SheetField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
};

// aria props of a field that may carry an error.
const errorProps = (id, error) => (error ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {});

// Modal that edits the patient sheet (sex, weight, height, body fat %, assessment date).
const EditSheetModal = ({ sheet, submitting, onClose, onSubmit }) => {
  const [values, setValues] = useState(() => toFormValues(sheet));
  const [errors, setErrors] = useState({});
  const setField = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(toBody(values));
  };

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>Cancelar</button>
      <button type="submit" form={FORM_ID} className="btn btn--primary" disabled={submitting}>
        {submitting ? 'Salvando…' : 'Salvar ficha'}
      </button>
    </>
  );

  return (
    <Modal title="Editar ficha" onClose={onClose} footer={footer} closeDisabled={submitting}>
      <form id={FORM_ID} className="my-food-form" onSubmit={handleSubmit}>
        <SheetField id="sheet-sex" label="Sexo" error={errors.sex}>
          <select id="sheet-sex" className="input" value={values.sex} onChange={setField('sex')} disabled={submitting} {...errorProps('sheet-sex', errors.sex)}>
            <option value="">Selecione</option>
            {Object.entries(SEX_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </SheetField>
        <SheetField id="sheet-weight" label="Peso (kg)" error={errors.weightKg}>
          <input id="sheet-weight" type="number" step="any" className="input" value={values.weightKg} onChange={setField('weightKg')} disabled={submitting} {...errorProps('sheet-weight', errors.weightKg)} />
        </SheetField>
        <SheetField id="sheet-height" label="Altura (cm)" error={errors.heightCm}>
          <input id="sheet-height" type="number" step="any" className="input" value={values.heightCm} onChange={setField('heightCm')} disabled={submitting} {...errorProps('sheet-height', errors.heightCm)} />
        </SheetField>
        <SheetField id="sheet-fat" label="% de gordura">
          <input id="sheet-fat" type="number" step="any" className="input" value={values.bodyFatPct} onChange={setField('bodyFatPct')} disabled={submitting} />
        </SheetField>
        <SheetField id="sheet-date" label="Data da avaliação">
          <input id="sheet-date" type="date" className="input" value={values.assessedAt} onChange={setField('assessedAt')} disabled={submitting} />
        </SheetField>
      </form>
    </Modal>
  );
};

EditSheetModal.propTypes = {
  sheet: PropTypes.object.isRequired,
  submitting: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default EditSheetModal;
