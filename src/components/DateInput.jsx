/* eslint-disable react/prop-types */
import { useState } from 'react';

const formatISOToDisplay = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

const formatDisplayToISO = (displayDate) => {
  const cleaned = displayDate.replace(/\D/g, '');
  if (cleaned.length !== 8) return null;
  
  const day = cleaned.substring(0, 2);
  const month = cleaned.substring(2, 4);
  const year = cleaned.substring(4, 8);
  
  return `${year}-${month}-${day}`;
};

const isValidDate = (day, month, year) => {
  const d = parseInt(day);
  const m = parseInt(month);
  const y = parseInt(year);

  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const daysInMonth = new Date(y, m, 0).getDate();
  if (d > daysInMonth) return false;

  return true;
};

const formatAsUserTypes = (input) => {
  const cleaned = input.replace(/\D/g, '');
  let formatted = cleaned;

  if (cleaned.length >= 2) {
    formatted = cleaned.substring(0, 2);
    if (cleaned.length >= 4) {
      formatted += '/' + cleaned.substring(2, 4);
      if (cleaned.length >= 8) {
        formatted += '/' + cleaned.substring(4, 8);
      } else if (cleaned.length > 4) {
        formatted += '/' + cleaned.substring(4);
      }
    } else if (cleaned.length > 2) {
      formatted += '/' + cleaned.substring(2);
    }
  }

  return formatted;
};

const DateInput = ({ value, onChange, className = '', required = false, disabled = false, ...props }) => {
  const [internalValue, setInternalValue] = useState('');
  const [error, setError] = useState('');
  const [lastPropValue, setLastPropValue] = useState(value);

  if (value !== lastPropValue) {
    setLastPropValue(value);
    setInternalValue(value ? formatISOToDisplay(value) : '');
    setError('');
  }

  const handleChange = (e) => {
    const input = e.target.value;
    const formatted = formatAsUserTypes(input);
    setInternalValue(formatted);

    const cleaned = input.replace(/\D/g, '');

    if (cleaned.length === 0) {
      setError('');
      onChange({ target: { value: '' } });
      return;
    }

    if (cleaned.length === 8) {
      const day = cleaned.substring(0, 2);
      const month = cleaned.substring(2, 4);
      const year = cleaned.substring(4, 8);

      if (isValidDate(day, month, year)) {
        setError('');
        const isoDate = formatDisplayToISO(formatted);
        onChange({ target: { value: isoDate } });
      } else {
        setError('Data inválida');
        onChange({ target: { value: '' } });
      }
    } else {
      setError('');
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div>
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        className={`${className}${error ? ' form-input--error' : ''}`}
        placeholder="dd/mm/aaaa"
        maxLength="10"
        required={required}
        disabled={disabled}
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default DateInput;
