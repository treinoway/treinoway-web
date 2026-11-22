import PropTypes from 'prop-types';
import Segmented from '../ds/Segmented';
import { GENDER_OPTIONS } from '../../constants/genderOrdination';
import { PARTICIPANT_MODE, PARTICIPANT_MODE_LABEL } from '../../constants/challenge';

const MODE_ITEMS = Object.freeze(
  [PARTICIPANT_MODE.ALL, PARTICIPANT_MODE.FILTER, PARTICIPANT_MODE.EXPLICIT].map((mode) => ({ id: mode, label: PARTICIPANT_MODE_LABEL[mode] })),
);

const MODE_HINTS = Object.freeze({
  [PARTICIPANT_MODE.ALL]: 'Todos os alunos ativos, inclusive quem entrar no time depois.',
  [PARTICIPANT_MODE.FILTER]: 'Os alunos que atendem ao filtro agora; depois tu adicionas e removes à mão.',
  [PARTICIPANT_MODE.EXPLICIT]: 'Só os alunos que escolheres.',
});

// Full name of a student, falling back to the e-mail
const studentNameOf = (student) => `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email;

// Number from a numeric input, or undefined when empty
const numberOrUndefined = (value) => (value === '' ? undefined : Number(value));

// Gender, age range and city of the Por filtro mode
const FilterFields = ({ filter, onChange, disabled }) => {
  const setFilterField = (field, value) => onChange({ ...filter, [field]: value });
  return (
    <div className="stack-sm">
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="participants-gender">Gênero</label>
        <select id="participants-gender" className="input" value={filter.gender ?? ''} disabled={disabled} onChange={(event) => setFilterField('gender', event.target.value || undefined)}>
          <option value="">Qualquer</option>
          {GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="participants-min-age">Idade mínima</label>
        <input id="participants-min-age" type="number" min={0} max={120} className="input" value={filter.minAge ?? ''} disabled={disabled} onChange={(event) => setFilterField('minAge', numberOrUndefined(event.target.value))} />
      </div>
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="participants-max-age">Idade máxima</label>
        <input id="participants-max-age" type="number" min={0} max={120} className="input" value={filter.maxAge ?? ''} disabled={disabled} onChange={(event) => setFilterField('maxAge', numberOrUndefined(event.target.value))} />
      </div>
      <div className="field">
        <label className="field-label type-caption-strong" htmlFor="participants-city">Cidade</label>
        <input id="participants-city" type="text" className="input" value={filter.city ?? ''} disabled={disabled} onChange={(event) => setFilterField('city', event.target.value || undefined)} />
      </div>
    </div>
  );
};

FilterFields.propTypes = {
  filter: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

// Checkbox list of the trainer's students for the Selecionar alunos mode
const ChosenStudents = ({ students, studentIds, onChange, disabled }) => {
  const toggle = (id) => onChange(studentIds.includes(id) ? studentIds.filter((item) => item !== id) : [...studentIds, id]);
  if (students.length === 0) return <p className="type-caption field-hint">Nenhum aluno para escolher.</p>;
  return (
    <div className="checkbox-list" role="group" aria-label="Alunos escolhidos">
      {students.map((student) => (
        <label key={student.id} className="checkbox-row">
          <input type="checkbox" checked={studentIds.includes(student.id)} disabled={disabled} onChange={() => toggle(student.id)} />
          {` ${studentNameOf(student)}`}
        </label>
      ))}
    </div>
  );
};

ChosenStudents.propTypes = {
  students: PropTypes.array.isRequired,
  studentIds: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

// Participants of a new championship: Todos os alunos, Por filtro (gender, age, city) or Selecionar alunos (checked students)
const ChallengeParticipantsField = ({ value, onChange, students, error, disabled = false }) => (
  <div className="field">
    <span className="field-label type-caption-strong">Participantes</span>
    <Segmented ariaLabel="Participantes" items={MODE_ITEMS} value={value.mode} disabled={disabled} onChange={(mode) => onChange({ ...value, mode })} />
    <span className="field-hint type-caption">{MODE_HINTS[value.mode]}</span>
    {value.mode === PARTICIPANT_MODE.FILTER && <FilterFields filter={value.filter} disabled={disabled} onChange={(filter) => onChange({ ...value, filter })} />}
    {value.mode === PARTICIPANT_MODE.EXPLICIT && <ChosenStudents students={students} studentIds={value.studentIds} disabled={disabled} onChange={(studentIds) => onChange({ ...value, studentIds })} />}
    {error && <span className="field-error type-caption" role="alert">{error}</span>}
  </div>
);

ChallengeParticipantsField.propTypes = {
  value: PropTypes.shape({
    mode: PropTypes.string.isRequired,
    filter: PropTypes.object.isRequired,
    studentIds: PropTypes.array.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  students: PropTypes.array.isRequired,
  error: PropTypes.string,
  disabled: PropTypes.bool,
};

export default ChallengeParticipantsField;
