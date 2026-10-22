import PropTypes from 'prop-types';

const FIELDS = [
  { key: 'min', label: 'Mín', type: 'number' },
  { key: 'max', label: 'Máx', type: 'number' },
  { key: 'unit', label: 'Unidade', type: 'text', placeholder: 'kg, cm…' },
];

const QuestionNumericConfig = ({ config, disabled, onFieldBlur }) => (
  <div className="numeric-config">
    {FIELDS.map(({ key, label, type, placeholder }) => (
      <div key={key} className="field">
        <label className="field-label type-caption-strong" htmlFor={`numeric-config-${key}`}>
          {label}
        </label>
        <input
          id={`numeric-config-${key}`}
          type={type}
          className="input"
          defaultValue={config?.[key] ?? ''}
          onBlur={onFieldBlur(key)}
          disabled={disabled}
          placeholder={placeholder}
        />
      </div>
    ))}
  </div>
);

QuestionNumericConfig.propTypes = {
  config: PropTypes.object,
  disabled: PropTypes.bool,
  onFieldBlur: PropTypes.func.isRequired,
};

export default QuestionNumericConfig;
