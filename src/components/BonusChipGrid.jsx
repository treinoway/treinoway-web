import { useState } from 'react';
import PropTypes from 'prop-types';

const DEFAULT_CHIPS = [5, 10, 25, 50, 100];

const BonusChipGrid = ({ onAward, disabled = false, showReason = true }) => {
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customError, setCustomError] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');

  const handleChipClick = (points) => {
    if (disabled) return;
    onAward(points, reason.trim() || undefined);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const parsed = Number.parseInt(customValue, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10000) {
      setCustomError('Informe um valor entre 1 e 10000.');
      return;
    }
    setCustomError('');
    onAward(parsed, reason.trim() || undefined);
    setCustomValue('');
    setCustomMode(false);
  };

  return (
    <div>
      <div className="bonus-chip-grid" role="group" aria-label="Valores de bônus">
        {DEFAULT_CHIPS.map((pts) => (
          <button
            key={pts}
            type="button"
            className="bonus-chip"
            onClick={() => handleChipClick(pts)}
            disabled={disabled}
            aria-label={`Conceder ${pts} pontos`}
          >
            +{pts}
          </button>
        ))}
        <button
          type="button"
          className="bonus-chip bonus-chip--other"
          onClick={() => setCustomMode((v) => !v)}
          disabled={disabled}
          aria-label="Outro valor"
          aria-expanded={customMode}
        >
          Outro
        </button>
      </div>

      {customMode && (
        <form onSubmit={handleCustomSubmit} className="form-group">
          <label className="form-label" htmlFor="bonus-custom-points">Valor personalizado</label>
          <input
            id="bonus-custom-points"
            type="number"
            className={`form-input${customError ? ' form-input--error' : ''}`}
            value={customValue}
            onChange={(e) => { setCustomValue(e.target.value); setCustomError(''); }}
            disabled={disabled}
            autoFocus
          />
          {customError && <span className="form-error">{customError}</span>}
          <div className="btn-group" style={{ marginTop: 'var(--spacing-sm)' }}>
            <button type="submit" className="btn-primary" disabled={disabled || !customValue}>
              Conceder
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setCustomMode(false); setCustomValue(''); setCustomError(''); }}
              disabled={disabled}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {showReason && (
        <div className="form-group">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setReasonOpen((v) => !v)}
            aria-expanded={reasonOpen}
            style={{ width: '100%' }}
          >
            {reasonOpen ? 'Ocultar motivo' : 'Adicionar motivo (opcional)'}
          </button>
          {reasonOpen && (
            <textarea
              className="form-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              rows={2}
              maxLength={300}
              placeholder="Por que este aluno merece este bônus?"
              disabled={disabled}
              style={{ marginTop: 'var(--spacing-sm)' }}
            />
          )}
        </div>
      )}
    </div>
  );
};

BonusChipGrid.propTypes = {
  onAward: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  showReason: PropTypes.bool,
};

export default BonusChipGrid;
