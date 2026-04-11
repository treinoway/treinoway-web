import { useId } from 'react';
import { AlertTriangle } from 'lucide-react';

const BrandingColorPicker = ({ label, value, onChange, optional, contrastWarning }) => {
  const inputId = useId();

  return (
    <div className="form-group">
      <label className="form-label">
        {label} {optional && <span className="text-muted">(opcional)</span>}
      </label>
      <div className="branding-color-picker-row">
        <label className="branding-color-swatch-label" htmlFor={inputId}>
          <input
            id={inputId}
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="branding-color-input-native"
            aria-label={`Escolher ${label}`}
          />
          <div
            className="branding-color-swatch-display"
            style={{ background: value || '#000000' }}
          />
        </label>
        <span className="branding-color-hex">{value || '—'}</span>
      </div>
      {contrastWarning && (
        <div className="branding-contrast-warning">
          <AlertTriangle size={12} />
          Contraste baixo — textos brancos podem ficar ilegíveis.
        </div>
      )}
    </div>
  );
};

export default BrandingColorPicker;
