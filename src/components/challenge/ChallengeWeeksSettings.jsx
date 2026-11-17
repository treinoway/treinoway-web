import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import ConfirmDialog from '../ds/ConfirmDialog';
import Toggle from '../ds/Toggle';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useHistoryBackGuard from '../../hooks/useHistoryBackGuard';
import useInternalLinkGuard from '../../hooks/useInternalLinkGuard';
import { translateError } from '../../i18n';
import { WEEK_COUNT_OPTIONS, closeNoticeOf, startMondayOptions } from '../../utils/challengeWeeks';
import { dayMonthOf } from '../../utils/consistencyFormat';
import { CHALLENGE_DESCRIPTION_MAX_LENGTH, CHALLENGE_NAME_MAX_LENGTH, CHALLENGE_STATUS } from '../../constants/challenge';
import { CONFIG_LIMITS } from '../../constants/consistencyRanking';

const DISCARD_MESSAGE = 'Há mudanças não salvas. Descartar e sair?';
const NAME_REQUIRED_MESSAGE = 'Informe o nome do campeonato.';
const FIELDS = Object.freeze(['name', 'description', 'startWeek', 'weeks', 'minPodiumWeeks', 'anonymousRanking']);
const SCHEDULE_FIELDS = Object.freeze(['startWeek', 'weeks', 'minPodiumWeeks']);

// Editable values of a weekly championship as the form holds them
const draftOf = (challenge) => ({
  name: challenge.name ?? '',
  description: challenge.description ?? '',
  startWeek: challenge.startDate,
  weeks: challenge.weeks,
  minPodiumWeeks: challenge.minPodiumWeeks,
  anonymousRanking: !!challenge.anonymousRanking,
});

// Fields whose draft value differs from the saved one, trimmed as the API takes them; schedule fields only while scheduled
const changesOf = (draft, saved, isScheduled) =>
  Object.fromEntries(
    FIELDS.filter((field) => isScheduled || !SCHEDULE_FIELDS.includes(field))
      .filter((field) => draft[field] !== saved[field])
      .map((field) => [field, typeof draft[field] === 'string' && field !== 'startWeek' ? draft[field].trim() : draft[field]]),
  );

// Start Mondays offered, keeping the saved one when it is no longer among them
const mondayChoicesOf = (startWeek, timeZone) => {
  const options = startMondayOptions(new Date(), timeZone);
  if (!startWeek || options.some((option) => option.value === startWeek)) return options;
  return [{ value: startWeek, label: `Segunda, ${dayMonthOf(startWeek)}` }, ...options];
};

// Draft of the form, reset whenever the saved championship changes
const useWeeksDraft = (challenge) => {
  const saved = useMemo(() => draftOf(challenge), [challenge]);
  const [state, setState] = useState({ saved, draft: saved });
  if (state.saved !== saved) setState({ saved, draft: saved });
  const setField = useCallback((field, value) => setState((current) => {
    const draft = { ...current.draft, [field]: value };
    if (field === 'weeks') draft.minPodiumWeeks = Math.min(draft.minPodiumWeeks, value);
    return { ...current, draft };
  }), []);
  return { saved, draft: state.saved === saved ? state.draft : saved, setField };
};

// Asks before leaving the page (links, browser Back, reload) while the form has unsaved changes
const useLeaveGuard = (isDirty, requestConfirm) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isDirty) return undefined;
    const warnBeforeUnload = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);
  const leaveTo = useCallback((path) => {
    requestConfirm({ message: DISCARD_MESSAGE, confirmLabel: 'Descartar', busyLabel: 'Saindo...', onConfirm: () => navigate(path) });
  }, [navigate, requestConfirm]);
  const leaveBack = useCallback((proceed) => {
    requestConfirm({ message: DISCARD_MESSAGE, confirmLabel: 'Descartar', busyLabel: 'Saindo...', onConfirm: proceed });
  }, [requestConfirm]);
  useInternalLinkGuard(isDirty, leaveTo);
  useHistoryBackGuard(isDirty, leaveBack);
};

// Name and description fields
const IdentityFields = ({ draft, setField, disabled, nameError }) => (
  <>
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="weeks-settings-name">Nome</label>
      <input id="weeks-settings-name" type="text" className={`input${nameError ? ' input--error' : ''}`} value={draft.name} maxLength={CHALLENGE_NAME_MAX_LENGTH} disabled={disabled} onChange={(event) => setField('name', event.target.value)} />
      {nameError && <span className="field-error type-caption" role="alert">{nameError}</span>}
    </div>
    <div className="field">
      <label className="field-label type-caption-strong" htmlFor="weeks-settings-description">Descrição</label>
      <textarea id="weeks-settings-description" className="input" rows={3} value={draft.description} maxLength={CHALLENGE_DESCRIPTION_MAX_LENGTH} disabled={disabled} onChange={(event) => setField('description', event.target.value)} />
      <span className="field-hint type-caption">{`${draft.description.length}/${CHALLENGE_DESCRIPTION_MAX_LENGTH}`}</span>
    </div>
  </>
);

IdentityFields.propTypes = {
  draft: PropTypes.object.isRequired,
  setField: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  nameError: PropTypes.string,
};

// Start Monday, number of weeks and podium minimum; editable only while scheduled
const ScheduleFields = ({ draft, setField, disabled, timeZone }) => {
  const podiumOptions = Array.from({ length: Math.min(CONFIG_LIMITS.minPodiumWeeks.max, draft.weeks) }, (_, index) => index + 1);
  return (
    <>
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="weeks-settings-start">Segunda de início</label>
        <select id="weeks-settings-start" className="input" value={draft.startWeek} disabled={disabled} onChange={(event) => setField('startWeek', event.target.value)}>
          {mondayChoicesOf(draft.startWeek, timeZone).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="weeks-settings-weeks">Semanas</label>
        <select id="weeks-settings-weeks" className="input" value={draft.weeks} disabled={disabled} onChange={(event) => setField('weeks', Number(event.target.value))}>
          {WEEK_COUNT_OPTIONS.map((count) => <option key={count} value={count}>{count}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="weeks-settings-podium">Mínimo para o pódio</label>
        <select id="weeks-settings-podium" className="input" value={draft.minPodiumWeeks} disabled={disabled} onChange={(event) => setField('minPodiumWeeks', Number(event.target.value))}>
          {podiumOptions.map((count) => <option key={count} value={count}>{`${count} ${count === 1 ? 'semana válida' : 'semanas válidas'}`}</option>)}
        </select>
      </div>
    </>
  );
};

ScheduleFields.propTypes = {
  draft: PropTypes.object.isRequired,
  setField: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  timeZone: PropTypes.string,
};

// Anonymous ranking switch with its visible label
const AnonymousRow = ({ checked, onChange, disabled }) => (
  <div className="toggle-row">
    <div className="toggle-row-content">
      <span className="toggle-row-title type-body-strong">Ranking anônimo</span>
      <span className="toggle-row-sub type-caption" id="weeks-settings-anonymous-hint">Os alunos veem a classificação sem os nomes dos colegas.</span>
    </div>
    <Toggle checked={checked} onChange={onChange} label="Ranking anônimo" describedBy="weeks-settings-anonymous-hint" disabled={disabled} />
  </div>
);

AnonymousRow.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

// Lifecycle buttons by status: end early while running, cancel while scheduled or running, delete while scheduled
const LifecycleActions = ({ status, closeRequested, onCloseEarly, onCancel, onDelete }) => {
  const isScheduled = status === CHALLENGE_STATUS.SCHEDULED;
  const isActive = status === CHALLENGE_STATUS.ACTIVE;
  if (!isScheduled && !isActive) return null;
  return (
    <section className="section-card settings-card" aria-label="Ciclo do campeonato">
      <div className="ds-actions">
        {isActive && !closeRequested && <button type="button" className="btn btn--secondary" onClick={onCloseEarly}>Encerrar campeonato</button>}
        <button type="button" className="btn btn--danger" onClick={onCancel}>Cancelar campeonato</button>
        {isScheduled && <button type="button" className="btn btn--danger" onClick={onDelete}>Excluir campeonato</button>}
      </div>
    </section>
  );
};

LifecycleActions.propTypes = {
  status: PropTypes.string.isRequired,
  closeRequested: PropTypes.bool.isRequired,
  onCloseEarly: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// Confirm requests of the lifecycle actions; each runs its callback only when confirmed
const useLifecycleRequests = (challenge, requestConfirm, { onCloseEarly, onCancel, onDelete, setClosesAt }) => ({
  handleCloseEarly: () => requestConfirm({
    message: `Encerrar "${challenge.name}" no fechamento desta semana? A semana em andamento será a última.`,
    confirmLabel: 'Encerrar campeonato',
    busyLabel: 'Encerrando...',
    onConfirm: async () => setClosesAt((await onCloseEarly())?.closesAt ?? null),
  }),
  handleCancel: () => requestConfirm({
    message: `Cancelar o campeonato "${challenge.name}"? Ele fica sem classificação final. Esta ação não pode ser desfeita.`,
    confirmLabel: 'Cancelar campeonato',
    busyLabel: 'Cancelando...',
    onConfirm: onCancel,
  }),
  handleDelete: () => requestConfirm({
    message: `Excluir o campeonato "${challenge.name}"? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    onConfirm: onDelete,
  }),
});

// Save of the changed fields: a missing name stays in the form, an API error is shown and the form keeps what was typed
const useWeeksSave = (draft, changes, onSave) => {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [nameError, setNameError] = useState(null);
  const handleSubmit = async (event) => {
    event.preventDefault();
    setNameError(draft.name.trim() ? null : NAME_REQUIRED_MESSAGE);
    if (!draft.name.trim()) return;
    setSaveError(null);
    setSaving(true);
    try {
      await onSave(changes);
    } catch (error) {
      setSaveError(error.userMessage || translateError(error));
    } finally {
      setSaving(false);
    }
  };
  return { saving, saveError, nameError, handleSubmit };
};

// Settings of a weekly championship: fields enabled by status, save, end early, cancel and delete with confirmation, and a discard prompt on leaving with unsaved changes
const ChallengeWeeksSettings = ({ challenge, timeZone, closesAt: knownClosesAt = null, onSave, onCloseEarly, onCancel, onDelete, onDirtyChange, children }) => {
  const { saved, draft, setField } = useWeeksDraft(challenge);
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [requestedClosesAt, setClosesAt] = useState(null);
  const closesAt = requestedClosesAt ?? knownClosesAt;
  const isScheduled = challenge.status === CHALLENGE_STATUS.SCHEDULED;
  const isEditable = isScheduled || challenge.status === CHALLENGE_STATUS.ACTIVE;
  const changes = changesOf(draft, saved, isScheduled);
  const isDirty = isEditable && Object.keys(changes).length > 0;
  const { saving, saveError, nameError, handleSubmit } = useWeeksSave(draft, changes, onSave);
  const requests = useLifecycleRequests(challenge, requestConfirm, { onCloseEarly, onCancel, onDelete, setClosesAt });

  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);
  useLeaveGuard(isDirty, requestConfirm);

  const closeRequested = !!challenge.closeRequestedAt || !!requestedClosesAt;
  const fieldsDisabled = saving || !isEditable;

  return (
    <div className="stack-md">
      {closeRequested && isEditable && (
        <div className="settings-notice">
          <CalendarClock size={16} strokeWidth={2} aria-hidden="true" />
          <span className="type-body">{closeNoticeOf(closesAt, timeZone, challenge.endDate)}</span>
        </div>
      )}
      <form className="section-card settings-card" onSubmit={handleSubmit} aria-label="Configuração do campeonato" noValidate>
        {saveError && <span className="field-error type-caption" role="alert">{saveError}</span>}
        <IdentityFields draft={draft} setField={setField} disabled={fieldsDisabled} nameError={nameError} />
        <ScheduleFields draft={draft} setField={setField} disabled={saving || !isScheduled} timeZone={timeZone} />
        <AnonymousRow checked={draft.anonymousRanking} onChange={(next) => setField('anonymousRanking', next)} disabled={fieldsDisabled} />
        {children}
        {isEditable && (
          <div className="ds-actions">
            <button type="submit" className="btn btn--primary" disabled={saving || !isDirty}>{saving ? 'Salvando...' : 'Salvar configuração'}</button>
          </div>
        )}
      </form>
      <LifecycleActions status={challenge.status} closeRequested={closeRequested} onCloseEarly={requests.handleCloseEarly} onCancel={requests.handleCancel} onDelete={requests.handleDelete} />
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

ChallengeWeeksSettings.propTypes = {
  challenge: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    weeks: PropTypes.number.isRequired,
    minPodiumWeeks: PropTypes.number,
    anonymousRanking: PropTypes.bool,
    closeRequestedAt: PropTypes.string,
  }).isRequired,
  timeZone: PropTypes.string,
  closesAt: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onCloseEarly: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDirtyChange: PropTypes.func,
  children: PropTypes.node,
};

export default ChallengeWeeksSettings;
