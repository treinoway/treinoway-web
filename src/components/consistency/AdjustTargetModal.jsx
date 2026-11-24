import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';
import Banner from '../ds/Banner';
import { translateError } from '../../i18n';
import { PILLAR, PILLAR_LABELS } from '../../constants/consistencyRanking';

const ADJUSTABLE_PILLARS = Object.freeze([PILLAR.WORKOUTS, PILLAR.CARDIO]);

// Pillars offered in the field: the ones with a known target, or the adjustable ones when targets are not supplied
const pillarsOf = (targets) => (targets ? targets.map((target) => target.pillar) : ADJUSTABLE_PILLARS);

// Modal that lowers the target of one pillar for the running week; the service refuses values above the frozen target
const AdjustTargetModal = ({ targets, studentName, onSubmit, onClose }) => {
  const formId = useId();
  const pillars = pillarsOf(targets);
  const [pillar, setPillar] = useState(pillars[0]);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const currentTarget = targets?.find((target) => target.pillar === pillar)?.expected;

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (value === '') return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ pillar, value: Number(value) });
      onClose();
    } catch (err) {
      setError(err.userMessage || translateError(err));
      setBusy(false);
    }
  };

  const footer = (
    <>
      <button type="button" className="btn btn--neutral" disabled={busy} onClick={handleClose}>Cancelar</button>
      <button type="submit" form={formId} className="btn btn--primary" disabled={busy || value === ''}>{busy ? 'Carregando...' : 'Salvar'}</button>
    </>
  );

  return (
    <Modal title="Ajustar meta" eyebrow={studentName} onClose={handleClose} closeDisabled={busy} footer={footer}>
      <form id={formId} className="consistency-form" noValidate onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${formId}-pillar`}>Pilar</label>
          <select id={`${formId}-pillar`} className="input" value={pillar} disabled={busy} onChange={(event) => setPillar(event.target.value)}>
            {pillars.map((item) => (
              <option key={item} value={item}>{PILLAR_LABELS[item]}</option>
            ))}
          </select>
          {currentTarget !== undefined && <span className="field-hint type-caption">{`Meta da semana: ${currentTarget}`}</span>}
        </div>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${formId}-value`}>Nova meta</label>
          <input id={`${formId}-value`} className="input" type="number" min={0} step={1} value={value} disabled={busy} onChange={(event) => setValue(event.target.value)} />
        </div>
        {error && <Banner tone="error">{error}</Banner>}
      </form>
    </Modal>
  );
};

AdjustTargetModal.propTypes = {
  targets: PropTypes.arrayOf(PropTypes.shape({ pillar: PropTypes.string.isRequired, expected: PropTypes.number.isRequired })),
  studentName: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AdjustTargetModal;
