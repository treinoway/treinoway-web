import PropTypes from 'prop-types';
import { Dumbbell, HeartPulse, StretchHorizontal, Activity, Info } from 'lucide-react';

const EXERCISE_TYPES = [
  { value: 'strength', label: 'Força', Icon: Dumbbell },
  { value: 'cardio', label: 'Cardio', Icon: HeartPulse },
  { value: 'mobility', label: 'Mobilidade', Icon: StretchHorizontal },
  { value: 'stretching', label: 'Alongamento', Icon: Activity },
];

/** "Identificação" section: name + type radio group. */
const ExerciseIdentitySection = ({ className, name, type, nameError, autoFocusName, onNameChange, onTypeChange }) => (
  <section className={className} aria-labelledby="exercise-identity-heading">
    <h2 id="exercise-identity-heading" className="editor-page__section-title type-h3">Identificação</h2>

    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="exercise-name">
        Nome <span aria-hidden="true" className="field-required">*</span>
      </label>
      <input
        id="exercise-name"
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className={`input${nameError ? ' input--error' : ''}`}
        placeholder="Ex.: Agachamento livre"
        aria-invalid={!!nameError}
        autoFocus={autoFocusName}
      />
      {nameError && <span className="field-error type-caption" role="alert">{nameError}</span>}
    </div>

    <div className="field">
      <span className="field-label type-caption-strong" id="exercise-type-label">
        Tipo <span aria-hidden="true" className="field-required">*</span>
      </span>
      <div className="type-picker" role="radiogroup" aria-label="Tipo do exercício">
        {EXERCISE_TYPES.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={type === value}
            className={`type-picker__option type-body-strong${type === value ? ' type-picker__option--active' : ''}`}
            onClick={() => onTypeChange(value)}
          >
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </div>

    <p className="editor-page__note type-caption">
      <Info size={16} strokeWidth={2} aria-hidden="true" />
      Séries, repetições, carga e descanso são definidos ao adicionar este exercício a um treino.
    </p>
  </section>
);

ExerciseIdentitySection.propTypes = {
  className: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  nameError: PropTypes.string,
  autoFocusName: PropTypes.bool,
  onNameChange: PropTypes.func.isRequired,
  onTypeChange: PropTypes.func.isRequired,
};

export default ExerciseIdentitySection;
