import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import {
  ANAMNESIS_FILLED_BY,
  ANAMNESIS_QUESTION_TYPE,
  ANAMNESIS_RESPONSE_STATUS,
} from '../../constants/anamnesis';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';
import { isAnswerEmpty, isOptionSelected, toValueList } from '../../utils/anamnesisAnswers';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getInitials = (student) => {
  const first = student?.firstName?.[0] ?? '';
  const last = student?.lastName?.[0] ?? '';
  return (first + last).toUpperCase() || (student?.email?.[0] ?? '?').toUpperCase();
};

const getStudentName = (student) => {
  if (!student) return '—';
  const name = [student.firstName, student.lastName].filter(Boolean).join(' ');
  return name || student.email || '—';
};

const computeAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
};

const computeBmi = (weight, height) => {
  if (!weight || !height) return null;
  const heightM = height > 10 ? height / 100 : height;
  const bmi = weight / (heightM * heightM);
  return isNaN(bmi) || !isFinite(bmi) ? null : bmi.toFixed(1);
};

// Only trainer-filled responses carry authorship info; student-filled ones keep the plain header.
const getAuthorshipBadge = (response) => {
  if (response?.filledBy !== ANAMNESIS_FILLED_BY.TRAINER) return null;
  const filledBy = `Preenchida pelo ${(response.filledByLabel || 'Professor').toLowerCase()}`;
  if (response.status === ANAMNESIS_RESPONSE_STATUS.AWAITING_CONFIRMATION) {
    return {
      className: 'badge badge--tag badge--brand',
      text: `${filledBy} · ${response.statusLabel || 'Aguardando confirmação'}`,
    };
  }
  if (response.status === ANAMNESIS_RESPONSE_STATUS.SUBMITTED) {
    return {
      className: 'badge badge--tag badge--success',
      text: `${filledBy} · Confirmada pelo aluno em ${formatDateTimeForDisplay(response.studentConfirmedAt)}`,
    };
  }
  return null;
};

// ─── Answer renderers ────────────────────────────────────────────────────────

const AnswerEmpty = () => <p className="qa-answer-empty">Sem resposta</p>;

const NumericAnswer = ({ value, unit }) => (
  <div className="qa-answer-numeric">
    <span className="qa-answer-numeric-value">{value}</span>
    {unit && <span className="qa-answer-numeric-unit">{unit}</span>}
  </div>
);

const formatOrphanValue = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

const SelectedMarker = () => <span className="visually-hidden"> (resposta selecionada)</span>;

// Every choice-like type (dichotomous included) shows all its options with the
// chosen ones highlighted. Answers are stored as option text; a value matching
// none of the current options is still shown.
const ChoiceAnswer = ({ options, value, labelledBy }) => {
  const orphanValues = toValueList(value).filter(
    (item) => !options.some((option) => isOptionSelected(option, item)),
  );

  return (
    <ul className="qa-answer-chips" aria-labelledby={labelledBy}>
      {options.map((option) => {
        const selected = isOptionSelected(option, value);
        return (
          <li
            key={option.id ?? option.text}
            className={`qa-answer-chip${selected ? ' qa-answer-chip--selected' : ''}`}
          >
            {option.text}
            {selected && <SelectedMarker />}
          </li>
        );
      })}
      {orphanValues.map((item, index) => (
        <li key={`orphan-${index}`} className="qa-answer-chip qa-answer-chip--selected qa-answer-chip--orphan">
          {`${formatOrphanValue(item)} (fora das opções atuais)`}
          <SelectedMarker />
        </li>
      ))}
    </ul>
  );
};

const DICHOTOMOUS_OPTIONS = [{ text: 'Sim' }, { text: 'Não' }];
const DICHOTOMOUS_VALUES = {
  Sim: [true, 'true', 'yes', 'sim'],
  'Não': [false, 'false', 'no', 'nao', 'não'],
};

// Stored as 'yes'/'no' by the answer wizard; older data may hold booleans or pt-BR text.
const toDichotomousText = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value;
  const match = Object.entries(DICHOTOMOUS_VALUES).find(([, values]) => values.includes(normalized));
  return match ? match[0] : value;
};

const getQuestionLabelId = (questionId) => `qa-question-${questionId}`;

const renderAnswer = (question, answer) => {
  if (!answer || isAnswerEmpty(answer.value)) return <AnswerEmpty />;

  const { type, config } = question;
  const { value } = answer;
  const labelledBy = getQuestionLabelId(question.id);

  switch (type) {
    case ANAMNESIS_QUESTION_TYPE.FREE_TEXT:
      return <blockquote className="qa-answer-text">{value}</blockquote>;
    case ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS:
      return <ChoiceAnswer options={DICHOTOMOUS_OPTIONS} value={toDichotomousText(value)} labelledBy={labelledBy} />;
    case ANAMNESIS_QUESTION_TYPE.NUMERIC:
      return <NumericAnswer value={value} unit={config?.unit ?? ''} />;
    case ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE:
    case ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE:
    case ANAMNESIS_QUESTION_TYPE.MATRIX:
      return <ChoiceAnswer options={question.options ?? []} value={value} labelledBy={labelledBy} />;
    default:
      return <p className="qa-answer-empty">{String(value)}</p>;
  }
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const StudentStat = ({ label, value, unit }) => {
  if (value === null || value === undefined) return null;
  return (
    <div className="kpi">
      <dt className="kpi-label type-overline">{label}</dt>
      <dd className="kpi-line">
        <span className="kpi-value type-h4">{value}</span>
        {unit && <span className="kpi-support type-caption">{` ${unit}`}</span>}
      </dd>
    </div>
  );
};

const DossierSection = ({ section, answerMap, sectionRef }) => {
  const sortedQuestions = [...(section.questions ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="dossier-section" id={`section-${section.id}`} ref={sectionRef}>
      <h2 className="dossier-section-title">{section.title}</h2>
      {sortedQuestions.map((q) => {
        const answer = answerMap[q.id] ?? null;
        return (
          <div key={q.id} className="qa-block">
            <p className="qa-question" id={getQuestionLabelId(q.id)}>{q.text}</p>
            {renderAnswer(q, answer)}
          </div>
        );
      })}
    </div>
  );
};

NumericAnswer.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
};

ChoiceAnswer.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, text: PropTypes.string })).isRequired,
  value: PropTypes.any,
  labelledBy: PropTypes.string.isRequired,
};

StudentStat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
};

DossierSection.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    questions: PropTypes.array,
  }).isRequired,
  answerMap: PropTypes.object.isRequired,
  sectionRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
};

// ─── Main component ──────────────────────────────────────────────────────────

const AnamnesisResponseDetail = () => {
  const { studentId, anamnesisId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [anamnesis, setAnamnesis] = useState(null);
  const [answerMap, setAnswerMap] = useState({});
  const [responseNotFound, setResponseNotFound] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [authorshipBadge, setAuthorshipBadge] = useState(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  const sectionRefs = useRef({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [studentRes, anamnesisRes] = await Promise.all([
          api.get(`/trainer/students/${studentId}`),
          api.get(`/trainer/anamneses/${anamnesisId}`),
        ]);

        setStudent(studentRes.data);
        setAnamnesis(anamnesisRes.data);

        try {
          const responseRes = await api.get(
            `/trainer/students/${studentId}/anamneses/${anamnesisId}/response`,
          );
          const answers = responseRes.data?.answers ?? [];
          const map = {};
          answers.forEach((a) => { map[a.questionId] = a; });
          setAnswerMap(map);
          setSubmittedAt(responseRes.data?.submittedAt ?? null);
          setAuthorshipBadge(getAuthorshipBadge(responseRes.data));
        } catch (err) {
          if (err.response?.status === 404) {
            setResponseNotFound(true);
          } else {
            showToast(err.userMessage || translateError(err), 'error');
          }
        }
      } catch (err) {
        showToast(err.userMessage || translateError(err), 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [studentId, anamnesisId, showToast]);

  const handleScrollToSection = (sectionId, index) => {
    setActiveSectionIndex(index);
    const el = sectionRefs.current[sectionId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  const sortedSections = [...(anamnesis?.sections ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  const age = computeAge(student?.birthDate);
  const weight = student?.weight ?? student?.weightKg ?? null;
  const heightRaw = student?.height ?? student?.heightCm ?? null;
  const bmi = computeBmi(weight, heightRaw);
  const studentName = getStudentName(student);
  const initials = getInitials(student);
  const goal = student?.goalType ?? student?.goal ?? null;

  const metaText = responseNotFound
    ? 'Aguardando resposta'
    : submittedAt
      ? `Respondida em ${formatDateTimeForDisplay(submittedAt)} · v${anamnesis?.version ?? 1} do template`
      : `v${anamnesis?.version ?? 1} do template`;

  return (
    <div>
      <div className="page-header dossier-page-header">
        <div className="page-header-title-row">
          <button
            type="button"
            className="btn-back"
            onClick={() => navigate(`/trainer/students/${studentId}/anamneses`)}
            aria-label="Voltar para as anamneses do aluno"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {student ? studentName : 'Aluno'}
          </button>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={handlePrint}>
            <Printer size={16} strokeWidth={2} aria-hidden="true" />
            Exportar PDF
          </button>
        </div>
      </div>

      <section className="section-card dossier-header" aria-label="Resumo da anamnese">
        {anamnesis?.title && <h1 className="type-h2 dossier-header-title">{anamnesis.title}</h1>}
        <div className="dossier-header-student">
          <span className="avatar avatar--lg" aria-hidden="true">{initials}</span>
          <div className="dossier-header-identity">
            <p className="type-h4">{studentName}</p>
            <div className="dossier-header-badges">
              {age !== null && <span className="badge badge--tag badge--neutral">{age} anos</span>}
              {goal && <span className="badge badge--tag badge--neutral">{goal}</span>}
            </div>
          </div>
        </div>
        <dl className="dossier-header-stats">
          <StudentStat label="Peso" value={weight} unit="kg" />
          <StudentStat label="Altura" value={heightRaw} unit="cm" />
          <StudentStat label="IMC" value={bmi} unit="" />
          <StudentStat label="Idade" value={age} unit="" />
        </dl>
        <div className="dossier-meta-bar">
          <span className="type-caption dossier-meta-text">{metaText}</span>
          {authorshipBadge && <span className={authorshipBadge.className}>{authorshipBadge.text}</span>}
        </div>
      </section>

      <div className="dossier-shell">
        {/* Mobile stepper */}
        <nav className="dossier-stepper" aria-label="Seções da anamnese">
          {sortedSections.map((section, i) => (
            <button
              key={section.id}
              type="button"
              className={`dossier-stepper-item${activeSectionIndex === i ? ' dossier-stepper-item--active' : ''}`}
              onClick={() => handleScrollToSection(section.id, i)}
              aria-label={section.title}
            >
              <span className="dossier-stepper-badge">{i + 1}</span>
              <span className="dossier-stepper-label">{section.title}</span>
            </button>
          ))}
        </nav>

        <div className="dossier-body">
          {/* Desktop sidebar */}
          <nav className="dossier-sidebar" aria-label="Navegação de seções">
            <p className="type-overline dossier-sidebar-heading">Seções</p>
            {sortedSections.map((section, i) => (
              <button
                key={section.id}
                type="button"
                className={`dossier-section-nav-item${activeSectionIndex === i ? ' dossier-section-nav-item--active' : ''}`}
                onClick={() => handleScrollToSection(section.id, i)}
              >
                <FileText size={14} strokeWidth={2} aria-hidden="true" />
                {section.title}
              </button>
            ))}
          </nav>

          {/* Main content */}
          <main className="dossier-main">
            {sortedSections.map((section) => (
              <DossierSection
                key={section.id}
                section={section}
                answerMap={answerMap}
                sectionRef={(el) => { sectionRefs.current[section.id] = el; }}
              />
            ))}
            {sortedSections.length === 0 && (
              <p className="qa-answer-empty">Nenhuma seção encontrada nesta anamnese.</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AnamnesisResponseDetail;
