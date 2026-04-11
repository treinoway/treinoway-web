import { useState, useRef, useEffect } from 'react';
import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Custom Select — drop-in replacement for <select className="form-select">.
 * Accepts <option> children and calls onChange with { target: { value } }.
 */
export default function Select({
  children,
  value,
  onChange,
  id,
  disabled,
  required,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const options = React.Children.toArray(children)
    .filter((child) => React.isValidElement(child) && child.type === 'option')
    .map((child) => ({
      value: child.props.value,
      label: child.props.children,
      disabled: child.props.disabled,
    }));

  const selectedOption = options.find((o) => String(o.value) === String(value));
  const isPlaceholder = !selectedOption || selectedOption.value === '' || selectedOption.value == null;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (optValue) => {
    // Native <select> always returns a string via e.target.value — match that behavior.
    onChange({ target: { value: String(optValue) } });
    setOpen(false);
  };

  const errorClass = className.includes('form-select--error') ? ' custom-select--error' : '';

  return (
    <div className={`custom-select${errorClass}`} ref={ref}>
      <button
        type="button"
        role="combobox"
        id={id}
        value={value ?? ''}
        disabled={disabled}
        className={`custom-select__trigger${open ? ' custom-select__trigger--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
      >
        <span className={`custom-select__value${isPlaceholder ? ' custom-select__value--placeholder' : ''}`}>
          {selectedOption?.label ?? options[0]?.label ?? ''}
        </span>
        <ChevronDown
          size={16}
          className={`custom-select__chevron${open ? ' custom-select__chevron--open' : ''}`}
        />
      </button>

      {open && (
        <ul className="custom-select__dropdown" role="listbox">
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              data-value={opt.value}
              aria-selected={String(opt.value) === String(value)}
              className={[
                'custom-select__option',
                String(opt.value) === String(value) ? 'custom-select__option--selected' : '',
                opt.disabled ? 'custom-select__option--disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => !opt.disabled && handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
