import { useState } from 'react';
import PropTypes from 'prop-types';
import { Info } from 'lucide-react';
import { POINTS_FIELDS } from '../constants/points-fields';
import { countDiffs } from '../utils/pointsDiff';

const toInputValue = (value) =>
  value === null || value === undefined ? '' : String(value);

const toIntOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const PointsBottomSheet = ({
  mode,
  values,
  template,
  onSave,
  onClose,
  saving,
  bannerText,
  statusAlert,
}) => {
  const isEditable = mode === 'editable';
  const isPreview = mode === 'preview';
  const [localValues, setLocalValues] = useState(() => ({ ...values }));
  const [localAnonymous, setLocalAnonymous] = useState(() => !!values.anonymousRanking);

  const handleChange = (key, raw) => {
    setLocalValues((prev) => ({ ...prev, [key]: raw }));
  };

  const handleRestore = () => {
    if (!template) return;
    const restored = {};
    POINTS_FIELDS.forEach(({ key }) => {
      restored[key] = template[key];
    });
    setLocalValues((prev) => ({ ...prev, ...restored }));
    setLocalAnonymous(!!template.anonymousRanking);
  };

  const handleSave = () => {
    const payload = {};
    POINTS_FIELDS.forEach(({ key }) => {
      payload[key] = toIntOrNull(localValues[key]);
    });
    payload.anonymousRanking = localAnonymous;
    onSave(payload);
  };

  const templateLoaded = !!template;
  const hasDiff = (key) => {
    if (!template) return false;
    return toIntOrNull(localValues[key]) !== toIntOrNull(template[key]);
  };

  const displayValues = isEditable ? localValues : values;
  const displayAnonymous = isEditable ? localAnonymous : !!values.anonymousRanking;
  const anonymousDiff = template ? displayAnonymous !== !!template.anonymousRanking : false;
  const diffCount = countDiffs(displayValues, template) + (anonymousDiff ? 1 : 0);

  return (
    <div className="overlay">
      <div
        className="bottom-sheet bottom-sheet--large"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bottom-sheet-header">
          <h3 className="bottom-sheet-title">Regras de pontuação</h3>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>
        <div className="bottom-sheet-body">
          {statusAlert && (
            <div className="points-alert" role="alert">
              {statusAlert}
            </div>
          )}

          {bannerText && (
            <div className="info-banner" role="note">
              <Info size={16} className="info-banner-icon" />
              <span>{bannerText}</span>
            </div>
          )}

          {isPreview && (
            <div className="info-banner" role="note">
              <Info size={16} className="info-banner-icon" />
              <span>
                Seus valores padrão serão aplicados. Você pode editar após criar
                o desafio.
              </span>
            </div>
          )}

          <div className="points-field-list">
            {POINTS_FIELDS.map(({ key, label, helper }) => (
              <div className="points-field" key={key}>
                <div className="points-field__header">
                  <span className="points-field__label">
                    {label}
                    {hasDiff(key) && (
                      <span
                        className="points-diff-dot"
                        aria-label="Valor diferente do padrão"
                      />
                    )}
                  </span>
                </div>
                <span className="points-field__helper">{helper}</span>
                {isEditable ? (
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={toInputValue(localValues[key])}
                    onChange={(e) => handleChange(key, e.target.value)}
                    disabled={saving}
                    placeholder={
                      key === 'dailyPointsCap' ? 'Sem limite' : undefined
                    }
                    aria-label={label}
                  />
                ) : (
                  <span className="points-field__value">
                    {displayValues[key] != null ? displayValues[key] : '-'}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="points-field">
            <div className="points-field__header">
              <span className="points-field__label">
                Ranking anônimo
                {anonymousDiff && (
                  <span
                    className="points-diff-dot"
                    aria-label="Valor diferente do padrão"
                  />
                )}
              </span>
            </div>
            <span className="points-field__helper">Ocultar nomes dos outros participantes no ranking</span>
            {isEditable ? (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={localAnonymous}
                  onChange={(e) => setLocalAnonymous(e.target.checked)}
                  disabled={saving}
                  aria-label="Ranking anônimo"
                />
                {' '}{localAnonymous ? 'Sim' : 'Não'}
              </label>
            ) : (
              <span className="points-field__value">
                {displayAnonymous ? 'Sim' : 'Não'}
              </span>
            )}
          </div>

          {isEditable && (
            <div className="btn-group" style={{ marginTop: 'var(--spacing-lg)' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRestore}
                disabled={!templateLoaded || saving || diffCount === 0}
              >
                Restaurar padrão
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

PointsBottomSheet.propTypes = {
  mode: PropTypes.oneOf(['editable', 'readOnly', 'preview']).isRequired,
  values: PropTypes.object.isRequired,
  template: PropTypes.object,
  onSave: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  bannerText: PropTypes.string,
  statusAlert: PropTypes.string,
};

export default PointsBottomSheet;
