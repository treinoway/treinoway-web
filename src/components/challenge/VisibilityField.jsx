import PropTypes from 'prop-types';
import { CHALLENGE_VISIBILITY, CHALLENGE_VISIBILITY_OPTIONS } from '../../constants/challenge';

// One radio card: the hidden radio, its drawn circle, the title and what the student sees (web-configuracao.png)
const VisibilityOption = ({ option, name, checked, disabled, onChange }) => (
  <label className={`visibility-option${checked ? ' visibility-option--selected' : ''}${disabled ? ' visibility-option--disabled' : ''}`}>
    <input type="radio" className="visibility-option__input" name={name} value={option.value} checked={checked} disabled={disabled} onChange={() => onChange(option.value)} />
    <span className="visibility-option__radio" aria-hidden="true" />
    <span className="visibility-option__text">
      <span className="visibility-option__title type-body-strong">{option.title}</span>
      <span className="visibility-option__description type-caption">{option.description}</span>
    </span>
  </label>
);

VisibilityOption.propTypes = {
  option: PropTypes.shape({ value: PropTypes.string.isRequired, title: PropTypes.string.isRequired, description: PropTypes.string.isRequired }).isRequired,
  name: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

// "Visibilidade no app": Desligado, Só a posição do aluno or Ranking completo ao vivo (the default) as radio cards (APP-35)
const VisibilityField = ({ value, onChange, disabled = false, name = 'challenge-visibility', children = null }) => {
  const current = value ?? CHALLENGE_VISIBILITY.FULL;
  return (
    <fieldset className="visibility-field">
      <legend className="visibility-field__legend type-caption-strong">Visibilidade no app</legend>
      <div className="visibility-field__options">
        {CHALLENGE_VISIBILITY_OPTIONS.map((option) => (
          <VisibilityOption key={option.value} option={option} name={name} checked={current === option.value} disabled={disabled} onChange={onChange} />
        ))}
      </div>
      {children}
    </fieldset>
  );
};

VisibilityField.propTypes = {
  value: PropTypes.oneOf(Object.values(CHALLENGE_VISIBILITY)),
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  name: PropTypes.string,
  children: PropTypes.node,
};

export default VisibilityField;
