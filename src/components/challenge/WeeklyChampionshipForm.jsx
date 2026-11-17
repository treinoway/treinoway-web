import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Segmented from '../ds/Segmented';
import Toggle from '../ds/Toggle';
import ChallengeParticipantsField from './ChallengeParticipantsField';
import useWeeklyChampionshipSources from '../../hooks/useWeeklyChampionshipSources';
import { extractErrorInfo, translateError } from '../../i18n';
import { WEEK_COUNT_OPTIONS, startMondayOptions } from '../../utils/challengeWeeks';
import { CHALLENGE_DESCRIPTION_MAX_LENGTH, CHALLENGE_FORMAT, CHALLENGE_NAME_MAX_LENGTH, CHALLENGE_WEEKLY_TEMPLATES, PARTICIPANT_MODE } from '../../constants/challenge';
import { CONFIG_LIMITS } from '../../constants/consistencyRanking';

const FORM_FIELDS = Object.freeze(['name', 'description', 'startWeek', 'weeks', 'minPodiumWeeks', 'participants']);
const NAME_REQUIRED = 'Informe o nome do campeonato.';
const DESCRIPTION_TOO_LONG = `A descrição pode ter até ${CHALLENGE_DESCRIPTION_MAX_LENGTH} caracteres.`;
const NO_STUDENT_CHOSEN = 'Escolha pelo menos um aluno.';
const API_FIELD_TO_FORM = Object.freeze({ filter: 'participants', studentIds: 'participants', participantMode: 'participants' });
const PARTICIPANT_MESSAGE_CODES = Object.freeze(['challenge.filter.empty', 'challenge.participant.notTrainee']);

// Initial draft from the first template
const initialDraft = () => ({
  templateId: CHALLENGE_WEEKLY_TEMPLATES[0].id,
  name: CHALLENGE_WEEKLY_TEMPLATES[0].defaultName,
  description: '',
  startWeek: null,
  weeks: CHALLENGE_WEEKLY_TEMPLATES[0].weeks,
  minPodiumWeeks: null,
  anonymousRanking: false,
  participants: { mode: PARTICIPANT_MODE.ALL, filter: {}, studentIds: [] },
});

// Podium minimum choices: 1 to min(4, weeks)
const podiumOptionsOf = (weeks) => Array.from({ length: Math.min(CONFIG_LIMITS.minPodiumWeeks.max, weeks) }, (_, index) => index + 1);

// Field errors found before calling the API
const validate = (draft) => {
  const errors = {};
  if (!draft.name.trim()) errors.name = NAME_REQUIRED;
  if (draft.description.length > CHALLENGE_DESCRIPTION_MAX_LENGTH) errors.description = DESCRIPTION_TOO_LONG;
  if (draft.participants.mode === PARTICIPANT_MODE.EXPLICIT && draft.participants.studentIds.length === 0) errors.participants = NO_STUDENT_CHOSEN;
  return errors;
};

// Participant part of the create body by mode
const participantsBodyOf = ({ mode, filter, studentIds }) => {
  if (mode === PARTICIPANT_MODE.FILTER) return { participantMode: mode, filter };
  if (mode === PARTICIPANT_MODE.EXPLICIT) return { participantMode: mode, studentIds };
  return { participantMode: mode };
};

// Form field an API error belongs to, or 'form' when it names none
const errorFieldOf = (error) => {
  const { details, messageCode } = extractErrorInfo(error);
  if (PARTICIPANT_MESSAGE_CODES.includes(messageCode)) return 'participants';
  const apiField = Array.isArray(details) ? details[0]?.field : details?.field;
  const field = API_FIELD_TO_FORM[apiField] ?? apiField;
  return FORM_FIELDS.includes(field) ? field : 'form';
};

// One template button per weekly model
const TemplatePicker = ({ templateId, onSelect, disabled }) => {
  const selected = CHALLENGE_WEEKLY_TEMPLATES.find((template) => template.id === templateId);
  return (
    <div className="field">
      <span className="field-label type-caption-strong">Modelo</span>
      <Segmented ariaLabel="Modelo" items={CHALLENGE_WEEKLY_TEMPLATES.map(({ id, name }) => ({ id, label: name }))} value={templateId} disabled={disabled} onChange={onSelect} />
      {selected && <span className="field-hint type-caption">{selected.description}</span>}
    </div>
  );
};

TemplatePicker.propTypes = {
  templateId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

// Labeled field with its error message
const Field = ({ id, label, error, hint, children }) => (
  <div className="field">
    <label className="field-label type-caption-strong" htmlFor={id}>{label}</label>
    {children}
    {hint && <span className="field-hint type-caption">{hint}</span>}
    {error && <span className="field-error type-caption" role="alert">{error}</span>}
  </div>
);

Field.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  error: PropTypes.string,
  hint: PropTypes.string,
  children: PropTypes.node.isRequired,
};

// Name and description inputs
const IdentityFields = ({ draft, setField, errors, disabled }) => (
  <>
    <Field id="weekly-name" label="Nome do campeonato" error={errors.name}>
      <input id="weekly-name" type="text" className={`input${errors.name ? ' input--error' : ''}`} value={draft.name} maxLength={CHALLENGE_NAME_MAX_LENGTH} disabled={disabled} onChange={(event) => setField('name', event.target.value)} />
    </Field>
    <Field id="weekly-description" label="Descrição" error={errors.description} hint={`${draft.description.length}/${CHALLENGE_DESCRIPTION_MAX_LENGTH} · Conta o prêmio, se tiver.`}>
      <textarea id="weekly-description" rows={3} className={`input${errors.description ? ' input--error' : ''}`} value={draft.description} disabled={disabled} onChange={(event) => setField('description', event.target.value)} />
    </Field>
  </>
);

IdentityFields.propTypes = {
  draft: PropTypes.object.isRequired,
  setField: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
};

// Start Monday, number of weeks and podium minimum selects
const ScheduleFields = ({ values, mondays, setField, errors, disabled }) => (
  <>
    <Field id="weekly-start" label="Segunda de início" error={errors.startWeek}>
      <select id="weekly-start" className="input" value={values.startWeek} disabled={disabled} onChange={(event) => setField('startWeek', event.target.value)}>
        {mondays.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
    <Field id="weekly-weeks" label="Semanas" error={errors.weeks}>
      <select id="weekly-weeks" className="input" value={values.weeks} disabled={disabled} onChange={(event) => setField('weeks', Number(event.target.value))}>
        {WEEK_COUNT_OPTIONS.map((count) => <option key={count} value={count}>{count}</option>)}
      </select>
    </Field>
    <Field id="weekly-podium" label="Mínimo para o pódio" error={errors.minPodiumWeeks}>
      <select id="weekly-podium" className="input" value={values.minPodiumWeeks} disabled={disabled} onChange={(event) => setField('minPodiumWeeks', Number(event.target.value))}>
        {podiumOptionsOf(values.weeks).map((count) => <option key={count} value={count}>{`${count} ${count === 1 ? 'semana válida' : 'semanas válidas'}`}</option>)}
      </select>
    </Field>
  </>
);

ScheduleFields.propTypes = {
  values: PropTypes.object.isRequired,
  mondays: PropTypes.array.isRequired,
  setField: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  disabled: PropTypes.bool,
};

// Anonymous ranking switch with its visible label
const AnonymousRow = ({ checked, onChange, disabled }) => (
  <div className="toggle-row">
    <div className="toggle-row-content">
      <span className="toggle-row-title type-body-strong">Ranking anônimo</span>
      <span className="toggle-row-sub type-caption" id="weekly-anonymous-hint">Os alunos veem a classificação sem os nomes dos colegas.</span>
    </div>
    <Toggle checked={checked} onChange={onChange} label="Ranking anônimo" describedBy="weekly-anonymous-hint" disabled={disabled} />
  </div>
);

AnonymousRow.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

// Draft of the form with the template and weeks rules (a template refills weeks, name and point rules; fewer weeks clamp the podium minimum)
const useWeeklyDraft = (onTemplateSelected) => {
  const [draft, setDraft] = useState(initialDraft);
  const setField = (field, value) => setDraft((current) => {
    const next = { ...current, [field]: value };
    if (field === 'weeks' && next.minPodiumWeeks) next.minPodiumWeeks = Math.min(next.minPodiumWeeks, value);
    return next;
  });
  const selectTemplate = (templateId) => {
    const template = CHALLENGE_WEEKLY_TEMPLATES.find((item) => item.id === templateId);
    setDraft((current) => ({ ...current, templateId, name: template.defaultName, weeks: template.weeks, minPodiumWeeks: current.minPodiumWeeks && Math.min(current.minPodiumWeeks, template.weeks) }));
    onTemplateSelected();
  };
  return { draft, setField, selectTemplate };
};

// Create body of a weekly championship from the draft, the effective schedule and the point rules
const bodyOf = (draft, values, pointsBody) => ({
  name: draft.name.trim(),
  ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
  format: CHALLENGE_FORMAT.WEEKS,
  startWeek: values.startWeek,
  weeks: values.weeks,
  minPodiumWeeks: values.minPodiumWeeks,
  ...participantsBodyOf(draft.participants),
  ...pointsBody,
  anonymousRanking: draft.anonymousRanking,
});

// Submit: validates, sends the body and maps an API error to its field, keeping everything typed
const useWeeklySubmit = (draft, values, pointsBody, onCreate) => {
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setCreating(true);
    try {
      await onCreate(bodyOf(draft, values, pointsBody));
    } catch (error) {
      setErrors({ [errorFieldOf(error)]: error.userMessage || translateError(error) });
    } finally {
      setCreating(false);
    }
  };
  return { errors, creating, handleSubmit };
};

// Weekly championship form: template, name, description, start Monday, weeks, podium minimum, participants, anonymous ranking and the XP rules
const WeeklyChampionshipForm = ({ pointsSummary, pointsBody, onTemplateSelected, onCreate, onDirtyChange }) => {
  const sources = useWeeklyChampionshipSources(true);
  const { draft, setField, selectTemplate } = useWeeklyDraft(onTemplateSelected);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft());
  useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);
  const mondays = useMemo(() => startMondayOptions(new Date(), sources.timeZone), [sources.timeZone]);
  const values = {
    startWeek: draft.startWeek ?? mondays[0].value,
    weeks: draft.weeks,
    minPodiumWeeks: draft.minPodiumWeeks ?? Math.min(sources.minPodiumWeeks, draft.weeks),
  };
  const { errors, creating, handleSubmit } = useWeeklySubmit(draft, values, pointsBody, onCreate);

  return (
    <form className="stack-md" onSubmit={handleSubmit} aria-label="Novo campeonato em semanas" noValidate>
      <TemplatePicker templateId={draft.templateId} onSelect={selectTemplate} disabled={creating} />
      <IdentityFields draft={draft} setField={setField} errors={errors} disabled={creating} />
      <ScheduleFields values={values} mondays={mondays} setField={setField} errors={errors} disabled={creating} />
      <ChallengeParticipantsField value={draft.participants} onChange={(participants) => setField('participants', participants)} students={sources.students} error={errors.participants} disabled={creating} />
      <AnonymousRow checked={draft.anonymousRanking} onChange={(next) => setField('anonymousRanking', next)} disabled={creating} />
      {pointsSummary}
      {errors.form && <span className="field-error type-caption" role="alert">{errors.form}</span>}
      <div className="ds-actions">
        <button type="submit" className="btn btn--primary" disabled={creating}>{creating ? 'Criando...' : 'Criar campeonato'}</button>
      </div>
    </form>
  );
};

WeeklyChampionshipForm.propTypes = {
  pointsSummary: PropTypes.node,
  pointsBody: PropTypes.object.isRequired,
  onTemplateSelected: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onDirtyChange: PropTypes.func,
};

export default WeeklyChampionshipForm;
