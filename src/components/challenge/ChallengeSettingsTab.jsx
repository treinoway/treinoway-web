import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import ConfirmDialog from '../ds/ConfirmDialog';
import Toggle from '../ds/Toggle';
import DateInput from '../DateInput';
import ScoringRulesCard from './ScoringRulesCard';
import { useToast } from '../../contexts/ToastContext';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useHistoryBackGuard from '../../hooks/useHistoryBackGuard';
import useInternalLinkGuard from '../../hooks/useInternalLinkGuard';
import { translateError } from '../../i18n';
import { WEEK_COUNT_OPTIONS, closeNoticeOf, startMondayOptions } from '../../utils/challengeWeeks';
import { dayMonthOf } from '../../utils/consistencyFormat';
import { isScoringRuleValid } from '../../utils/consistencyWeights';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { CHALLENGE_DESCRIPTION_MAX_LENGTH, CHALLENGE_NAME_MAX_LENGTH, CHALLENGE_STATUS } from '../../constants/challenge';
import { CONFIG_DEFAULTS, CONFIG_LIMITS } from '../../constants/consistencyRanking';

const DISCARD_MESSAGE = 'Há mudanças não salvas. Descartar e sair?';
const NAME_REQUIRED_MESSAGE = 'Informe o nome do campeonato.';
const PODIUM_MINIMUM_HELP = 'Semanas válidas (com meta e sem pausa) que o aluno precisa somar no campeonato para disputar o pódio. Até lá, ele aparece como entrando no campeonato.';
const XP_RULE_KEYS = Object.freeze(['ptsWorkoutCompleted', 'ptsStreak7Days', 'ptsStreak30Days', 'ptsDailyCheckin', 'ptsEvolutionRecord', 'ptsWorkoutFeedback']);
const TEXT_FIELDS = Object.freeze(['name', 'description']);
const EDITABLE_FIELDS = Object.freeze({
  weeks: {
    [CHALLENGE_STATUS.SCHEDULED]: ['name', 'description', 'startWeek', 'weeks', 'minPodiumWeeks', 'anonymousRanking', 'rule', 'points'],
    [CHALLENGE_STATUS.ACTIVE]: ['name', 'description', 'anonymousRanking'],
  },
  dates: {
    [CHALLENGE_STATUS.SCHEDULED]: ['name', 'endDate', 'anonymousRanking', 'points'],
    [CHALLENGE_STATUS.ACTIVE]: ['name', 'endDate', 'anonymousRanking'],
  },
});

// Editable values of a championship as the settings hold them: both cards in one draft
const draftOf = (challenge) => ({
  name: challenge.name ?? '',
  description: challenge.description ?? '',
  startWeek: challenge.startDate,
  endDate: challenge.endDate,
  weeks: challenge.weeks,
  minPodiumWeeks: challenge.minPodiumWeeks,
  anonymousRanking: !!challenge.anonymousRanking,
  rule: { weights: challenge.weights ?? { ...CONFIG_DEFAULTS.weights }, activePillars: challenge.activePillars ?? [...CONFIG_DEFAULTS.activePillars] },
  points: Object.fromEntries(XP_RULE_KEYS.map((key) => [key, challenge[key] ?? null])),
});

// Whether two scoring rules hold the same weights and active pillars
const sameRule = (left, right) => JSON.stringify(left.weights) === JSON.stringify(right.weights) && [...left.activePillars].sort().join() === [...right.activePillars].sort().join();

// API fields of one changed draft field: the rule sends weights with active pillars, the points only the rules that changed
const apiChangesOf = (field, draft, saved) => {
  if (field === 'rule') return sameRule(draft.rule, saved.rule) ? {} : { weights: draft.rule.weights, activePillars: draft.rule.activePillars };
  if (field === 'points') return Object.fromEntries(XP_RULE_KEYS.filter((key) => draft.points[key] !== saved.points[key]).map((key) => [key, draft.points[key]]));
  if (draft[field] === saved[field]) return {};
  return { [field]: TEXT_FIELDS.includes(field) ? draft[field].trim() : draft[field] };
};

// Changed fields the championship still accepts in its status, as the PATCH takes them
const changesOf = (draft, saved, format, status) =>
  (EDITABLE_FIELDS[format][status] ?? []).reduce((changes, field) => ({ ...changes, ...apiChangesOf(field, draft, saved) }), {});

// Start Mondays offered, keeping the saved one when it is no longer among them
const mondayChoicesOf = (startWeek, timeZone) => {
  const options = startMondayOptions(new Date(), timeZone);
  if (!startWeek || options.some((option) => option.value === startWeek)) return options;
  return [{ value: startWeek, label: `Segunda, ${dayMonthOf(startWeek)}` }, ...options];
};

// Draft of both cards, reset whenever the saved championship changes
const useSettingsDraft = (challenge) => {
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

// Asks before leaving the page (links, browser Back, reload) while the settings have unsaved changes
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

// One "Salvar configuração" for both cards: a missing name stays in the form, an API error is shown and the form keeps what was typed
const useSettingsSave = (draft, changes, onSave) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [nameError, setNameError] = useState(null);
  const handleSubmit = async (event) => {
    event.preventDefault();
    setNameError(draft.name.trim() ? null : NAME_REQUIRED_MESSAGE);
    if (!draft.name.trim()) return;
    // why: the button stays enabled as the design system draws it; with nothing changed there is nothing to send
    if (Object.keys(changes).length === 0) {
      showToast('Configuração salva.', 'success');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      await onSave(changes);
      showToast('Configuração salva.', 'success');
    } catch (error) {
      setSaveError(error.userMessage || translateError(error));
    } finally {
      setSaving(false);
    }
  };
  return { saving, saveError, nameError, handleSubmit };
};

// Labeled field with an optional help text and error
const Field = ({ id, label, hint, error, children }) => (
  <div className="field">
    <label className="field-label type-caption-strong" htmlFor={id}>{label}</label>
    {children}
    {hint && <span className="field-hint type-caption" id={`${id}-hint`}>{hint}</span>}
    {error && <span className="field-error type-caption" role="alert">{error}</span>}
  </div>
);

Field.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
};

// Weekly fields: description, start Monday and weeks side by side, and the podium minimum with its help text; the schedule only while scheduled
const WeeklyFields = ({ draft, setField, disabled, scheduleDisabled, timeZone }) => {
  const podiumOptions = Array.from({ length: Math.min(CONFIG_LIMITS.minPodiumWeeks.max, draft.weeks) }, (_, index) => index + 1);
  return (
    <>
      <Field id="settings-description" label="Descrição" hint={`${draft.description.length}/${CHALLENGE_DESCRIPTION_MAX_LENGTH}`}>
        <textarea id="settings-description" className="input" rows={3} value={draft.description} maxLength={CHALLENGE_DESCRIPTION_MAX_LENGTH} disabled={disabled} onChange={(event) => setField('description', event.target.value)} />
      </Field>
      <div className="weekly-form__pair">
        <Field id="settings-start" label="Segunda de início">
          <select id="settings-start" className="input" value={draft.startWeek} disabled={scheduleDisabled} onChange={(event) => setField('startWeek', event.target.value)}>
            {mondayChoicesOf(draft.startWeek, timeZone).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field id="settings-weeks" label="Semanas">
          <select id="settings-weeks" className="input" value={draft.weeks} disabled={scheduleDisabled} onChange={(event) => setField('weeks', Number(event.target.value))}>
            {WEEK_COUNT_OPTIONS.map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </Field>
      </div>
      <Field id="settings-podium" label="Mínimo para o pódio" hint={PODIUM_MINIMUM_HELP}>
        <select id="settings-podium" className="input" aria-describedby="settings-podium-hint" value={draft.minPodiumWeeks} disabled={scheduleDisabled} onChange={(event) => setField('minPodiumWeeks', Number(event.target.value))}>
          {podiumOptions.map((count) => <option key={count} value={count}>{`${count} ${count === 1 ? 'semana válida' : 'semanas válidas'}`}</option>)}
        </select>
      </Field>
    </>
  );
};

WeeklyFields.propTypes = {
  draft: PropTypes.object.isRequired,
  setField: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  scheduleDisabled: PropTypes.bool.isRequired,
  timeZone: PropTypes.string,
};

// Dates fields: the start date, fixed, and the end date side by side
const DatesFields = ({ draft, setField, disabled }) => (
  <div className="weekly-form__pair">
    <Field id="settings-start-date" label="Data de início" hint="Não muda depois que o campeonato começa">
      <input id="settings-start-date" type="text" className="input" value={formatDateForDisplay(draft.startWeek)} disabled />
    </Field>
    <Field id="settings-end-date" label="Data de término" hint="Até 365 dias depois do início">
      <DateInput id="settings-end-date" className="input" value={draft.endDate} disabled={disabled} onChange={(event) => setField('endDate', event.target.value)} />
    </Field>
  </div>
);

DatesFields.propTypes = {
  draft: PropTypes.object.isRequired,
  setField: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

// Anonymous ranking switch with its visible label
const AnonymousRow = ({ checked, onChange, disabled }) => (
  <div className="toggle-row">
    <div className="toggle-row-content">
      <span className="toggle-row-title type-body-strong">Ranking anônimo</span>
      <span className="toggle-row-sub type-caption" id="settings-anonymous-hint">Ocultar o nome dos outros participantes para os alunos</span>
    </div>
    <Toggle checked={checked} onChange={onChange} label="Ranking anônimo" describedBy="settings-anonymous-hint" disabled={disabled} />
  </div>
);

AnonymousRow.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

// "Dados do campeonato" card: the fields the status allows and the one "Salvar configuração" of both cards
const DataCard = ({ form, isWeekly, timeZone }) => {
  const { draft, setField, editable, isScheduled, saving, canSave, saveError, nameError, handleSubmit } = form;
  const disabled = saving || !editable;
  return (
    <form className="section-card settings-card" onSubmit={handleSubmit} aria-label="Dados do campeonato" noValidate>
      <h2 className="type-h3">Dados do campeonato</h2>
      {saveError && <span className="field-error type-caption" role="alert">{saveError}</span>}
      <Field id="settings-name" label="Nome" error={nameError}>
        <input id="settings-name" type="text" className={`input${nameError ? ' input--error' : ''}`} value={draft.name} maxLength={CHALLENGE_NAME_MAX_LENGTH} disabled={disabled} onChange={(event) => setField('name', event.target.value)} />
      </Field>
      {isWeekly
        ? <WeeklyFields draft={draft} setField={setField} disabled={disabled} scheduleDisabled={saving || !isScheduled} timeZone={timeZone} />
        : <DatesFields draft={draft} setField={setField} disabled={disabled} />}
      <AnonymousRow checked={draft.anonymousRanking} onChange={(next) => setField('anonymousRanking', next)} disabled={disabled} />
      {editable && (
        <div className="ds-actions">
          <button type="submit" className="btn btn--primary" disabled={!canSave}>{saving ? 'Carregando...' : 'Salvar configuração'}</button>
        </div>
      )}
    </form>
  );
};

DataCard.propTypes = {
  form: PropTypes.object.isRequired,
  isWeekly: PropTypes.bool.isRequired,
  timeZone: PropTypes.string,
};

// "Zona de perigo": end early (weekly, running), cancel (scheduled or running) and delete (scheduled)
const DangerZone = ({ status, canCloseEarly, onCloseEarly, onCancel, onDelete }) => {
  const isScheduled = status === CHALLENGE_STATUS.SCHEDULED;
  if (!isScheduled && status !== CHALLENGE_STATUS.ACTIVE) return null;
  return (
    <section className="section-card settings-card" aria-labelledby="danger-zone-title">
      <h2 className="type-h4" id="danger-zone-title">Zona de perigo</h2>
      <p className="settings-card__help type-body">Cancelar congela o ranking. Excluir só é possível antes do início.</p>
      <div className="ds-actions">
        {canCloseEarly && <button type="button" className="btn btn--neutral" onClick={onCloseEarly}>Encerrar campeonato</button>}
        <button type="button" className="btn btn--neutral" onClick={onCancel}>Cancelar campeonato</button>
        {isScheduled && <button type="button" className="btn btn--danger" onClick={onDelete}>Excluir campeonato</button>}
      </div>
    </section>
  );
};

DangerZone.propTypes = {
  status: PropTypes.string.isRequired,
  canCloseEarly: PropTypes.bool.isRequired,
  onCloseEarly: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// Confirm requests of the danger zone (F2.5 wording); each runs its callback only when confirmed
const lifecycleRequestsOf = ({ challenge, isWeekly, requestConfirm, onCloseEarly, onCancel, onDelete, setClosesAt }) => ({
  handleCloseEarly: () => requestConfirm({
    message: `Encerrar "${challenge.name}" no fechamento desta semana? A semana em andamento será a última.`,
    confirmLabel: 'Encerrar campeonato',
    busyLabel: 'Encerrando...',
    onConfirm: async () => setClosesAt((await onCloseEarly())?.closesAt ?? null),
  }),
  handleCancel: () => requestConfirm({
    message: isWeekly
      ? `Cancelar o campeonato "${challenge.name}"? Ele fica sem classificação final. Esta ação não pode ser desfeita.`
      : `Cancelar o campeonato "${challenge.name}"? Esta ação não pode ser desfeita.`,
    confirmLabel: 'Cancelar campeonato',
    busyLabel: 'Cancelando...',
    onConfirm: onCancel,
  }),
  handleDelete: () => requestConfirm({ message: `Excluir o campeonato "${challenge.name}"? Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir', onConfirm: onDelete }),
});

// Draft, changes, validity and save of the settings form
const useSettingsForm = (challenge, isWeekly, onSave) => {
  const { saved, draft, setField } = useSettingsDraft(challenge);
  const isScheduled = challenge.status === CHALLENGE_STATUS.SCHEDULED;
  const editable = isScheduled || challenge.status === CHALLENGE_STATUS.ACTIVE;
  const changes = changesOf(draft, saved, isWeekly ? 'weeks' : 'dates', challenge.status);
  const isDirty = editable && Object.keys(changes).length > 0;
  const ruleValid = !isWeekly || isScoringRuleValid(draft.rule.weights, draft.rule.activePillars);
  const save = useSettingsSave(draft, changes, onSave);
  return { ...save, draft, setField, editable, isScheduled, isDirty, canSave: ruleValid && !save.saving };
};

// Settings tab: "Dados do campeonato" and "Regras de pontuação" side by side, saved together, then the "Zona de perigo"; asks before leaving with unsaved changes
const ChallengeSettingsTab = ({ challenge, isWeekly = false, timeZone, closesAt: knownClosesAt = null, onSave, onCloseEarly, onCancel, onDelete, onDirtyChange }) => {
  const form = useSettingsForm(challenge, isWeekly, onSave);
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [requestedClosesAt, setClosesAt] = useState(null);
  const requests = lifecycleRequestsOf({ challenge, isWeekly, requestConfirm, onCloseEarly, onCancel, onDelete, setClosesAt });
  useEffect(() => onDirtyChange?.(form.isDirty), [form.isDirty, onDirtyChange]);
  useLeaveGuard(form.isDirty, requestConfirm);
  const closesAt = requestedClosesAt ?? knownClosesAt;
  const closeRequested = !!challenge.closeRequestedAt || !!requestedClosesAt;
  const isActive = challenge.status === CHALLENGE_STATUS.ACTIVE;
  return (
    <div className="championship-tab">
      {closeRequested && form.editable && closesAt && (
        <div className="settings-notice">
          <CalendarClock size={16} strokeWidth={2} aria-hidden="true" />
          <span className="type-body">{closeNoticeOf(closesAt, timeZone)}</span>
        </div>
      )}
      <div className="challenge-settings__columns">
        <DataCard form={form} isWeekly={isWeekly} timeZone={timeZone} />
        <ScoringRulesCard status={challenge.status} showPillars={isWeekly} rule={form.draft.rule} points={form.draft.points} onRuleChange={(rule) => form.setField('rule', rule)} onPointsChange={(key, value) => form.setField('points', { ...form.draft.points, [key]: value })} />
      </div>
      <DangerZone status={challenge.status} canCloseEarly={isWeekly && isActive && !closeRequested} onCloseEarly={requests.handleCloseEarly} onCancel={requests.handleCancel} onDelete={requests.handleDelete} />
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

ChallengeSettingsTab.propTypes = {
  challenge: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    weeks: PropTypes.number,
    minPodiumWeeks: PropTypes.number,
    anonymousRanking: PropTypes.bool,
    closeRequestedAt: PropTypes.string,
    weights: PropTypes.object,
    activePillars: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  isWeekly: PropTypes.bool,
  timeZone: PropTypes.string,
  closesAt: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onCloseEarly: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDirtyChange: PropTypes.func,
};

export default ChallengeSettingsTab;
