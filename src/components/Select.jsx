import { useState, useRef, useEffect } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown } from 'lucide-react';

/**
 * Custom Select — drop-in replacement for <select className="form-select">.
 * Accepts <option> children and calls onChange with { target: { value } }.
 * The dropdown is rendered via a portal to document.body so it escapes
 * overflow:auto containers (e.g. bottom-sheet).
 */
export default function Select({
  children,
  value,
  onChange,
  id,
  name,
  disabled,
  required,
  className = '',
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

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

    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 1000,
    });

    const handler = (e) => {
      const insideTrigger = triggerRef.current?.contains(e.target);
      const insideDropdown = dropdownRef.current?.contains(e.target);
      if (!insideTrigger && !insideDropdown) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (optValue) => {
    onChange({ target: { value: String(optValue), name } });
    setOpen(false);
  };

  const errorClass = className.includes('form-select--error') ? ' custom-select--error' : '';

  const dropdown = (
    <ul
      ref={dropdownRef}
      className="custom-select__dropdown"
      role="listbox"
      style={dropdownStyle}
    >
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
  );

  return (
    <div className={`custom-select${errorClass}`}>
      <button
        ref={triggerRef}
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
        aria-label={ariaLabel}
      >
        <span className={`custom-select__value${isPlaceholder ? ' custom-select__value--placeholder' : ''}`}>
          {selectedOption?.label ?? options[0]?.label ?? ''}
        </span>
        <ChevronDown
          size={16}
          className={`custom-select__chevron${open ? ' custom-select__chevron--open' : ''}`}
        />
      </button>

      {open && ReactDOM.createPortal(dropdown, document.body)}
    </div>
  );
}
