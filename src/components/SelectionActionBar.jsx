import PropTypes from 'prop-types';
import { t } from '../i18n';

const interpolate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, key) =>
    values[key] !== undefined ? String(values[key]) : `{${key}}`
  );

/**
 * Sticky action bar shown at the top of the trainer's training detail
 * when selection mode is active. Shows "N selecionados", a "Cancelar"
 * button and the primary "Criar bi-set" CTA (enabled at ≥ 2).
 *
 * Pair with `<SelectionInstructionStrip />` directly underneath for
 * the "Selecione 2 a 6 exercícios…" copy.
 */
const SelectionActionBar = ({ selectedCount, maxCount = 6, onCancel, onConfirm, saving = false }) => {
  const countLabel = interpolate(
    t('exerciseGroup.selectionCount') || '{selected} selecionados',
    { selected: selectedCount, max: maxCount }
  );
  const canConfirm = selectedCount >= 2 && selectedCount <= maxCount && !saving;

  return (
    <div className="selection-action-bar" role="toolbar" aria-label="Seleção de exercícios">
      <span className="selection-action-bar-count type-body-strong" aria-live="polite">
        {countLabel}
      </span>
      <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>
        {t('exerciseGroup.cancelSelection') || 'Cancelar'}
      </button>
      <button
        type="button"
        className="btn btn--primary selection-action-bar-cta"
        onClick={onConfirm}
        disabled={!canConfirm}
      >
        {saving ? 'Carregando...' : t('exerciseGroup.createBiset') || 'Criar bi-set'}
      </button>
    </div>
  );
};

SelectionActionBar.propTypes = {
  selectedCount: PropTypes.number.isRequired,
  maxCount: PropTypes.number,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};

export const SelectionInstructionStrip = ({ short = false }) => (
  <p className="selection-instruction-strip type-caption" role="note">
    {short
      ? t('exerciseGroup.selectionInstruction')
      : t('exerciseGroup.selectionInstructionLong')}
  </p>
);

SelectionInstructionStrip.propTypes = {
  short: PropTypes.bool,
};

export default SelectionActionBar;
