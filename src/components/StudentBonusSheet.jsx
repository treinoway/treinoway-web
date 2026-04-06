import { useState } from 'react';
import PropTypes from 'prop-types';

const QUICK_CHIPS = [10, 25, 50, 100];

const getStudentDisplayName = (student) => {
  const full = `${student.firstName || ''} ${student.lastName || ''}`.trim();
  return full || 'Aluno';
};

const getInitials = (student) => {
  const name = getStudentDisplayName(student);
  return (name[0] || '?').toUpperCase();
};

const StudentBonusSheet = ({ student, onAward, onClose, disabled = false }) => {
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customError, setCustomError] = useState('');
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
  };

  return (
    <div className="overlay" onClick={() => !disabled && onClose()}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h3 className="bottom-sheet-title">Conceder bônus</h3>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={() => !disabled && onClose()}
            aria-label="Fechar"
          >&times;</button>
        </div>
        <div className="bottom-sheet-body">
          <div className="student-bonus-info">
            <div className="ranking-avatar" aria-hidden="true">
              {student.avatarUrl
                ? <img src={student.avatarUrl} alt="" />
                : getInitials(student)}
            </div>
            <div>
              <span className="font-medium">{getStudentDisplayName(student)}</span>
              <span className="text-sm text-muted" style={{ display: 'block' }}>
                {student.points != null ? `${student.points} pts` : ''}
              </span>
            </div>
          </div>

          <div className="bonus-chip-grid" role="group" aria-label="Valores de bônus">
            {QUICK_CHIPS.map((pts) => (
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
              <label className="form-label" htmlFor="student-bonus-custom">Valor personalizado</label>
              <input
                id="student-bonus-custom"
                type="number"
                className={`form-input${customError ? ' form-input--error' : ''}`}
                value={customValue}
                onChange={(e) => { setCustomValue(e.target.value); setCustomError(''); }}
                disabled={disabled}
                min="1"
                max="10000"
              />
              {customError && <span className="form-error">{customError}</span>}
              <button type="submit" className="btn-primary" disabled={disabled || !customValue} style={{ marginTop: 'var(--spacing-sm)' }}>
                Conceder
              </button>
            </form>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="student-bonus-reason">Motivo (opcional)</label>
            <textarea
              id="student-bonus-reason"
              className="form-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              rows={2}
              maxLength={300}
              placeholder="Por que este aluno merece este bônus?"
              disabled={disabled}
            />
            <span className="text-sm text-muted">O aluno verá este motivo no histórico de pontos</span>
          </div>
        </div>
      </div>
    </div>
  );
};

StudentBonusSheet.propTypes = {
  student: PropTypes.shape({
    studentId: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    avatarUrl: PropTypes.string,
    points: PropTypes.number,
  }).isRequired,
  onAward: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default StudentBonusSheet;
