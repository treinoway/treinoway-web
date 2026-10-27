import PropTypes from 'prop-types';
import PrescriptionField from '../PrescriptionField';

const REST_CHIPS = [60, 90, 120, 180];

// Rest chips plus the free rest-interval input (seconds).
const RestGroup = ({ restInterval, onFieldChange, onRestChip }) => {
  const activeChip = REST_CHIPS.includes(Number(restInterval)) ? Number(restInterval) : null;
  return (
    <div className="composer-rest-group">
      <label className="field-label type-caption-strong" htmlFor="composer-rest">Descanso</label>
      <div className="form-input-with-suffix">
        <input
          id="composer-rest"
          className="input"
          type="number"
          min="0"
          value={restInterval}
          onChange={(e) => onFieldChange('restInterval', e.target.value)}
          placeholder="90"
          aria-label="Intervalo de descanso em segundos"
        />
        <span className="form-input-suffix" aria-hidden="true">s</span>
      </div>
      <div className="chip-group" role="group" aria-label="Atalhos de descanso">
        {REST_CHIPS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            className={`chip${activeChip === seconds ? ' chip--active' : ''}`}
            onClick={() => onRestChip(seconds)}
            aria-pressed={activeChip === seconds}
          >
            {seconds}s
          </button>
        ))}
      </div>
    </div>
  );
};

RestGroup.propTypes = {
  restInterval: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onRestChip: PropTypes.func.isRequired,
};

// "Exercício com carga" switch plus the suggested-load input revealed when on.
const LoadGroup = ({ hasLoad, suggestedLoad, onFieldChange, onLoadToggle }) => (
  <div className="composer-load-col">
    <div className="composer-load-toggle-row">
      <span className="composer-load-toggle-label type-body" id="composer-load-label">
        Exercício com carga
      </span>
      <button
        type="button"
        role="switch"
        className="toggle"
        aria-labelledby="composer-load-label"
        aria-checked={hasLoad}
        onClick={() => onLoadToggle(!hasLoad)}
      />
    </div>
    {hasLoad && (
      <div className="composer-load-reveal">
        <label className="field-label type-caption-strong" htmlFor="composer-load">Carga sugerida</label>
        <div className="form-input-with-suffix">
          <input
            id="composer-load"
            className="input"
            type="number"
            min="0"
            step="0.5"
            value={suggestedLoad}
            onChange={(e) => onFieldChange('suggestedLoad', e.target.value)}
            placeholder="Ex: 20"
          />
          <span className="form-input-suffix" aria-hidden="true">kg</span>
        </div>
      </div>
    )}
  </div>
);

LoadGroup.propTypes = {
  hasLoad: PropTypes.bool.isRequired,
  suggestedLoad: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onLoadToggle: PropTypes.func.isRequired,
};

// Prescription band shared by the "Criar novo" form and the library single add (sets, reps/time and rest on one grid, then load).
const PrescriptionBand = ({ form, exerciseType, onFieldChange, onPrescriptionChange, onLoadToggle, onRestChip }) => (
  <div className="composer-band">
    <span className="composer-band-label type-body-strong">Prescrição</span>
    <PrescriptionField
      idPrefix="composer"
      formData={form}
      onChange={onPrescriptionChange}
      exerciseType={exerciseType}
      trailing={<RestGroup restInterval={form.restInterval} onFieldChange={onFieldChange} onRestChip={onRestChip} />}
    />
    <LoadGroup
      hasLoad={form.hasLoad}
      suggestedLoad={form.suggestedLoad}
      onFieldChange={onFieldChange}
      onLoadToggle={onLoadToggle}
    />
  </div>
);

PrescriptionBand.propTypes = {
  form: PropTypes.object.isRequired,
  /** Exercise type; cardio defaults the duration unit to minutes. */
  exerciseType: PropTypes.string,
  onFieldChange: PropTypes.func.isRequired,
  onPrescriptionChange: PropTypes.func.isRequired,
  onLoadToggle: PropTypes.func.isRequired,
  onRestChip: PropTypes.func.isRequired,
};

// Free-text notes field ("Observações") for the exercise.
export const NotesField = ({ value, onChange }) => (
  <div>
    <label className="field-label type-caption-strong" htmlFor="composer-notes">Observações</label>
    <textarea
      id="composer-notes"
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Dica de execução, postura, foco muscular…"
      rows={3}
      aria-label="Observações"
    />
  </div>
);

NotesField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default PrescriptionBand;
