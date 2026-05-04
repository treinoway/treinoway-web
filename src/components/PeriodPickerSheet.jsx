import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import {
  DASHBOARD_PERIOD_PRESETS,
  DASHBOARD_PERIOD_PRESET_LIST,
  buildPeriod,
  getPeriodPresetLabel,
} from '../constants/dashboardPeriod';
import { dateInputToIso, isoToDateInput } from '../utils/formatDashboardDate';

const SAME_DAY_HINT = 'Selecionando apenas 1 dia mostrará dados limitados.';

const isSameAsCurrent = (draft, current) => {
  if (!draft || !current) return true;
  if (draft.presetKey !== current.presetKey) return false;
  if (draft.presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM) {
    return draft.from === current.from && draft.to === current.to;
  }
  return true;
};

const isCustomDraftValid = (draft) =>
  draft.presetKey !== DASHBOARD_PERIOD_PRESETS.CUSTOM
  || (Boolean(draft.from) && Boolean(draft.to));

const buildCustomDraft = (current) => {
  if (current?.presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM) {
    return { from: isoToDateInput(current.from), to: isoToDateInput(current.to) };
  }
  return { from: '', to: '' };
};

const PeriodPickerSheetContent = ({ currentPeriod, onApply, onCancel, errorMessage }) => {
  const [draftPresetKey, setDraftPresetKey] = useState(currentPeriod.presetKey);
  const [customDraft, setCustomDraft] = useState(() => buildCustomDraft(currentPeriod));

  const draftPeriod = useMemo(() => {
    if (draftPresetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM) {
      const fromIso = dateInputToIso(customDraft.from);
      const toIso = dateInputToIso(customDraft.to);
      return { presetKey: draftPresetKey, from: fromIso, to: toIso };
    }
    return buildPeriod({ presetKey: draftPresetKey });
  }, [draftPresetKey, customDraft]);

  const isCustom = draftPresetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM;
  const showSameDayHint = isCustom && customDraft.from && customDraft.to && customDraft.from === customDraft.to;
  const sameAsCurrent = isSameAsCurrent(draftPeriod, currentPeriod);
  const isValid = isCustomDraftValid(draftPeriod);
  const canApply = !sameAsCurrent && isValid;

  const handleApply = () => {
    if (!canApply) return;
    onApply(draftPeriod);
  };

  const handleSelectPreset = (presetKey) => {
    setDraftPresetKey(presetKey);
  };

  return (
    <div className="overlay" onClick={onCancel} role="presentation">
      <div className="bottom-sheet period-picker-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="period-picker-title">
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title" id="period-picker-title">Período</h2>
          <button type="button" className="bottom-sheet-close" onClick={onCancel} aria-label="Fechar período">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="bottom-sheet-body period-picker-body">
          <ul className="period-picker-list" role="radiogroup" aria-label="Presets de período">
            {DASHBOARD_PERIOD_PRESET_LIST.map((presetKey) => {
              const selected = draftPresetKey === presetKey;
              return (
                <li key={presetKey}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`period-picker-option${selected ? ' period-picker-option--selected' : ''}`}
                    onClick={() => handleSelectPreset(presetKey)}
                  >
                    <span className="period-picker-option-radio" aria-hidden="true">
                      <span className="period-picker-option-radio-dot" />
                    </span>
                    <span className="period-picker-option-label">{getPeriodPresetLabel(presetKey)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {isCustom && (
            <div className="period-picker-custom">
              <div className="form-group">
                <label className="form-label" htmlFor="period-picker-from">De</label>
                <input
                  id="period-picker-from"
                  type="date"
                  className="form-input"
                  value={customDraft.from}
                  max={customDraft.to || undefined}
                  onChange={(e) => setCustomDraft((prev) => ({ ...prev, from: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="period-picker-to">Até</label>
                <input
                  id="period-picker-to"
                  type="date"
                  className="form-input"
                  value={customDraft.to}
                  min={customDraft.from || undefined}
                  onChange={(e) => setCustomDraft((prev) => ({ ...prev, to: e.target.value }))}
                />
              </div>
              {showSameDayHint && (
                <p className="period-picker-hint text-sm text-muted" role="status">{SAME_DAY_HINT}</p>
              )}
            </div>
          )}

          {errorMessage && (
            <p className="period-picker-error form-error" role="alert">{errorMessage}</p>
          )}
        </div>

        <div className="period-picker-footer">
          <button type="button" className="btn-secondary period-picker-footer-btn" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary period-picker-footer-btn"
            onClick={handleApply}
            disabled={!canApply}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

PeriodPickerSheetContent.propTypes = {
  currentPeriod: PropTypes.shape({
    presetKey: PropTypes.string.isRequired,
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
  onApply: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  errorMessage: PropTypes.string,
};

/**
 * Bottom-sheet period picker with deferred apply (per refined design):
 *  - Tapping a preset highlights it but does NOT trigger a refetch.
 *  - "Aplicar" is disabled until the selection differs from the current period.
 *  - Custom range is validated locally; backend errors render inline.
 *
 * The internal state lives in `PeriodPickerSheetContent`, which is fully mounted
 * on `open` and unmounted on close. This guarantees fresh draft state every time
 * the sheet opens, without resorting to a setState inside an effect.
 */
const PeriodPickerSheet = ({ open, currentPeriod, onApply, onCancel, errorMessage }) => {
  if (!open) return null;
  return (
    <PeriodPickerSheetContent
      currentPeriod={currentPeriod}
      onApply={onApply}
      onCancel={onCancel}
      errorMessage={errorMessage}
    />
  );
};

PeriodPickerSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  currentPeriod: PropTypes.shape({
    presetKey: PropTypes.string.isRequired,
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
  onApply: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  errorMessage: PropTypes.string,
};

export default PeriodPickerSheet;
