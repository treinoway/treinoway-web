import { useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';

const FORM_ID = 'my-food-form';
const REQUIRED = 'Campo obrigatório.';
const NEGATIVE = 'Não pode ser negativo.';
const POSITIVE = 'Informe um valor maior que zero.';
const NUTRIENT_FIELDS = [
  { key: 'kcal', label: 'Energia (kcal/100 g)', optional: false },
  { key: 'protein', label: 'Proteína (g/100 g)', optional: false },
  { key: 'carbs', label: 'Carboidrato (g/100 g)', optional: false },
  { key: 'fat', label: 'Lipídio (g/100 g)', optional: false },
  { key: 'fiber', label: 'Fibras (g/100 g)', optional: true },
];

// Initial form values, from the food being edited or empty.
const toFormValues = (food) => ({
  name: food?.name ?? '',
  groupId: food?.groupId ?? '',
  portionLabel: food?.portion?.label ?? '',
  portionGrams: food?.portion ? String(food.portion.grams) : '',
  per100g: Object.fromEntries(NUTRIENT_FIELDS.map(({ key }) => [key, food ? String(food.per100g[key]) : ''])),
});

// Validates a non-negative nutrient value; returns the error or null.
const validateNutrient = (raw, optional) => {
  if (raw === '') return optional ? null : REQUIRED;
  return Number(raw) < 0 ? NEGATIVE : null;
};

// Validates the whole form into an { field: message } map.
const validate = (values) => {
  const errors = {};
  if (!values.name.trim()) errors.name = REQUIRED;
  if (!values.groupId) errors.groupId = REQUIRED;
  if (!values.portionLabel.trim()) errors.portionLabel = REQUIRED;
  if (values.portionGrams === '') errors.portionGrams = REQUIRED;
  else if (Number(values.portionGrams) <= 0) errors.portionGrams = POSITIVE;
  NUTRIENT_FIELDS.forEach(({ key, optional }) => {
    const message = validateNutrient(values.per100g[key], optional);
    if (message) errors[key] = message;
  });
  return errors;
};

// Builds the API body from validated values.
const toBody = (values) => ({
  name: values.name.trim(),
  groupId: values.groupId,
  portion: { label: values.portionLabel.trim(), grams: Number(values.portionGrams) },
  per100g: Object.fromEntries(
    NUTRIENT_FIELDS.map(({ key }) => [key, values.per100g[key] === '' ? 0 : Number(values.per100g[key])]),
  ),
});

// Labelled field with its validation message.
const Field = ({ id, label, error, children }) => (
  <div className="field">
    <label className="field-label type-caption-strong" htmlFor={id}>{label}</label>
    {children}
    {error && <span className="field-error type-caption" role="alert">{error}</span>}
  </div>
);

Field.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
};

// Create / edit modal for one of the nutritionist own foods.
const MyFoodModal = ({ food, groups, submitting, onClose, onSubmit }) => {
  const [values, setValues] = useState(() => toFormValues(food));
  const [errors, setErrors] = useState({});
  const inputClass = (key) => `input${errors[key] ? ' input--error' : ''}`;
  const setField = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }));
  const setNutrient = (key) => (event) => setValues((prev) => ({ ...prev, per100g: { ...prev.per100g, [key]: event.target.value } }));

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
        {submitting ? 'Salvando…' : 'Salvar'}
      </button>
    </>
  );

  return (
    <Modal title={food ? 'Editar alimento' : 'Cadastrar alimento'} onClose={onClose} footer={footer} closeDisabled={submitting}>
      <form id={FORM_ID} className="my-food-form" onSubmit={handleSubmit} noValidate>
        <Field id="food-name" label="Nome do alimento" error={errors.name}>
          <input id="food-name" className={inputClass('name')} value={values.name} onChange={setField('name')} disabled={submitting} />
        </Field>
        <Field id="food-group" label="Grupo" error={errors.groupId}>
          <select id="food-group" className={inputClass('groupId')} value={values.groupId} onChange={setField('groupId')} disabled={submitting}>
            <option value="">Selecione</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </Field>
        <Field id="food-portion-label" label="Porção (medida caseira)" error={errors.portionLabel}>
          <input id="food-portion-label" className={inputClass('portionLabel')} value={values.portionLabel} onChange={setField('portionLabel')} disabled={submitting} />
        </Field>
        <Field id="food-portion-grams" label="Porção (g)" error={errors.portionGrams}>
          <input id="food-portion-grams" type="number" step="any" className={inputClass('portionGrams')} value={values.portionGrams} onChange={setField('portionGrams')} disabled={submitting} />
        </Field>
        {NUTRIENT_FIELDS.map(({ key, label }) => (
          <Field key={key} id={`food-${key}`} label={label} error={errors[key]}>
            <input id={`food-${key}`} type="number" step="any" className={inputClass(key)} value={values.per100g[key]} onChange={setNutrient(key)} disabled={submitting} />
          </Field>
        ))}
      </form>
    </Modal>
  );
};

MyFoodModal.propTypes = {
  food: PropTypes.object,
  groups: PropTypes.arrayOf(PropTypes.object).isRequired,
  submitting: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default MyFoodModal;
