import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import Modal from '../ds/Modal';
import Banner from '../ds/Banner';
import { translateError } from '../../i18n';
import { MAX_PAUSE_WEEKS_AHEAD, PAUSE_REASON_MAX_LENGTH } from '../../constants/consistencyRanking';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const SCOPE = Object.freeze({ STUDENT: 'student', TEAM: 'team' });

// "DD/MM" of a UTC timestamp
const dayMonthOf = (timestamp) => {
  const date = new Date(timestamp);
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

// Options of the week field: the current week and up to 12 ahead, each as "DD/MM a DD/MM"
const weekOptionsFrom = (currentWeekStart) =>
  Array.from({ length: MAX_PAUSE_WEEKS_AHEAD + 1 }, (_, index) => {
    const start = Date.parse(currentWeekStart) + index * DAYS_PER_WEEK * MS_PER_DAY;
    const range = `${dayMonthOf(start)} a ${dayMonthOf(start + (DAYS_PER_WEEK - 1) * MS_PER_DAY)}`;
    return { value: new Date(start).toISOString().slice(0, 10), label: index === 0 ? `Esta semana · ${range}` : range };
  });

// Modal that asks for the week to pause and an optional reason; the caller supplies the submit action (one student or the whole team)
const PauseWeekModal = ({ currentWeekStart, scope = SCOPE.STUDENT, studentName, onSubmit, onClose }) => {
  const formId = useId();
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isTeam = scope === SCOPE.TEAM;
  const title = isTeam ? 'Pausar semana do time' : 'Pausar semana';

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ weekStart, reason: reason.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err.userMessage || translateError(err));
      setBusy(false);
    }
  };

  const footer = (
    <>
      <button type="button" className="btn btn--secondary" disabled={busy} onClick={handleClose}>Cancelar</button>
      <button type="submit" form={formId} className="btn btn--primary" disabled={busy}>{busy ? 'Carregando...' : title}</button>
    </>
  );

  return (
    <Modal title={title} eyebrow={studentName} onClose={handleClose} closeDisabled={busy} footer={footer}>
      <form id={formId} className="consistency-form" onSubmit={handleSubmit}>
        {isTeam && <p className="type-body consistency-form__note">Pausa a semana de todos os alunos ativos.</p>}
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${formId}-week`}>Semana</label>
          <select id={`${formId}-week`} className="input" value={weekStart} disabled={busy} onChange={(event) => setWeekStart(event.target.value)}>
            {weekOptionsFrom(currentWeekStart).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label type-caption-strong" htmlFor={`${formId}-reason`}>Motivo (opcional)</label>
          <input
            id={`${formId}-reason`}
            className="input"
            type="text"
            maxLength={PAUSE_REASON_MAX_LENGTH}
            value={reason}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
          />
          <span className="field-hint type-caption consistency-form__counter">{`${reason.length}/${PAUSE_REASON_MAX_LENGTH}`}</span>
        </div>
        {error && <Banner tone="error">{error}</Banner>}
      </form>
    </Modal>
  );
};

PauseWeekModal.propTypes = {
  currentWeekStart: PropTypes.string.isRequired,
  scope: PropTypes.oneOf(Object.values(SCOPE)),
  studentName: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PauseWeekModal;
