import { useRef } from 'react';
import PropTypes from 'prop-types';
import { AppWindow, PanelRight } from 'lucide-react';

const OPTIONS = [
  { id: 'modal', label: 'Janela', icon: AppWindow },
  { id: 'side', label: 'Painel lateral', icon: PanelRight },
];

const ARROW_STEP = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

// Compact radio group (WAI-ARIA pattern: roving tabindex + arrow keys) that picks how the forms open.
const FormLayoutToggle = ({ value, onChange }) => {
  const radioRefs = useRef([]);

  const handleKeyDown = (event, index) => {
    const step = ARROW_STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const nextIndex = (index + step + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[nextIndex].id);
    radioRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="layout-toggle" role="radiogroup" aria-label="Formulários">
      {OPTIONS.map(({ id, label, icon: Icon }, index) => (
        <button
          key={id}
          ref={(node) => { radioRefs.current[index] = node; }}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={label}
          title={label}
          tabIndex={value === id ? 0 : -1}
          className={`layout-toggle__option${value === id ? ' layout-toggle__option--active' : ''}`}
          onClick={() => onChange(id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          <Icon size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
};

FormLayoutToggle.propTypes = {
  value: PropTypes.oneOf(['modal', 'side']).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default FormLayoutToggle;
