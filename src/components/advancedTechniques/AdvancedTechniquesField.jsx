import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { Info, Plus } from 'lucide-react';
import TechniquePicker from './TechniquePicker';
import SelectedTechniquesList from './SelectedTechniquesList';
import InlineTechniqueForm from './InlineTechniqueForm';
import { MAX_ADVANCED_TECHNIQUES, getTechniqueIds } from '../../utils/advancedTechniques';

// Controlled ordered-techniques field: search picker, drag/up/down/remove list and inline create.
const AdvancedTechniquesField = ({ value, onChange, disabled = false }) => {
  const idPrefix = useId();
  const [creating, setCreating] = useState(false);

  const isFull = value.length >= MAX_ADVANCED_TECHNIQUES;
  const controlsDisabled = disabled || isFull;

  const handlePick = (technique) => onChange([...value, technique]);

  const handleCreated = (technique) => {
    setCreating(false);
    onChange([...value, technique]);
  };

  return (
    <div className="technique-field">
      <TechniquePicker addedIds={getTechniqueIds(value)} disabled={controlsDisabled} onSelect={handlePick} />

      {value.length > 0
        ? <SelectedTechniquesList value={value} disabled={disabled} onChange={onChange} />
        : <p className="technique-field__empty type-caption">Nenhuma técnica adicionada.</p>}

      {isFull && (
        <p className="technique-field__limit type-caption" role="status">
          <Info size={16} strokeWidth={2} aria-hidden="true" />
          Máximo de {MAX_ADVANCED_TECHNIQUES} técnicas por exercício.
        </p>
      )}

      {creating ? (
        <InlineTechniqueForm idPrefix={idPrefix} onCreated={handleCreated} onCancel={() => setCreating(false)} />
      ) : (
        <button type="button" className="btn btn--ghost technique-field__create" disabled={controlsDisabled} onClick={() => setCreating(true)}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Criar nova técnica
        </button>
      )}
    </div>
  );
};

AdvancedTechniquesField.propTypes = {
  value: PropTypes.arrayOf(PropTypes.object).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default AdvancedTechniquesField;
