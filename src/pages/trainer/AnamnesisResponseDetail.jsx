import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { ANAMNESIS_QUESTION_TYPE } from '../../constants/anamnesis';
import { formatDateForDisplay } from '../../utils/dateFormat';
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

// ─── Answer renderers ────────────────────────────────────────────────────────

const AnswerEmpty = () => <p className="qa-answer-empty">Sem resposta</p>;

const BooleanAnswer = ({ value }) => {
  const isYes = value === true || value === 'true' || value === 'sim' || value === 'yes';
  return (
    <span className={`qa-answer-bool ${isYes ? 'qa-answer-bool--yes' : 'qa-answer-bool--no'}`}>
      {isYes ? 'Sim' : 'Não'}
    </span>
  );
};

const NumericAnswer = ({ value, unit }) => (
  <div className="qa-answer-numeric">
    <span className="qa-answer-numeric-value">{value}</span>
    {unit && <span className="qa-answer-numeric-unit">{unit}</span>}
  </div>
);

const formatOrphanValue = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

// Answers are stored as option text; single/multiple/matrix all render over the
// question's current options. A value matching none of them is still shown.
const ChoiceAnswer = ({ question, value }) => {
  const options = question.options ?? [];
  const orphanValues = toValueList(value).filter(
    (item) => !options.some((option) => isOptionSelected(option, item)),
  );

  return (
    <div className="qa-answer-chips">
      {options.map((option) => (
        <span
          key={option.id ?? option.text}
          className={`qa-answer-chip${isOptionSelected(option, value) ? ' qa-answer-chip--selected' : ''}`}
        >
          {option.text}
        </span>
      ))}
      {orphanValues.map((item, index) => (
        <span key={`orphan-${index}`} className="qa-answer-chip qa-answer-chip--selected qa-answer-chip--orphan">
          {`${formatOrphanValue(item)} (fora das opções atuais)`}
        </span>
      ))}
    </div>
  );
};

const renderAnswer = (question, answer) => {
  if (!answer || isAnswerEmpty(answer.value)) return <AnswerEmpty />;

  const { type, config } = question;
  const { value } = answer;

  switch (type) {
    case ANAMNESIS_QUESTION_TYPE.FREE_TEXT:
      return <blockquote className="qa-answer-text">{value}</blockquote>;
    case ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS:
      return <BooleanAnswer value={value} />;
    case ANAMNESIS_QUESTION_TYPE.NUMERIC:
      return <NumericAnswer value={value} unit={config?.unit ?? ''} />;
    case ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE:
    case ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE:
    case ANAMNESIS_QUESTION_TYPE.MATRIX:
      return <ChoiceAnswer question={question} value={value} />;
    default:
      return <p className="qa-answer-empty">{String(value)}</p>;
  }
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const HeroStat = ({ label, value, unit }) => {
  if (value === null || value === undefined) return null;
  return (
    <div>
      <div className="dossier-hero-stat-label">{label}</div>
      <div className="dossier-hero-stat-value">
        {value}
        {unit && <span className="dossier-hero-stat-unit">{unit}</span>}
      </div>
    </div>
  );
};

const DossierSection = ({ section, answerMap, sectionRef }) => {
  const sortedQuestions = [...(section.questions ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <div className="dossier-section" id={`section-${section.id}`} ref={sectionRef}>
      <div className="dossier-section-title">{section.title}</div>
      {sortedQuestions.map((q) => {
        const answer = answerMap[q.id] ?? null;
        return (
          <div key={q.id} className="qa-block">
            <p className="qa-question">{q.text}</p>
            {renderAnswer(q, answer)}
          </div>
        );
      })}
    </div>
  );
};

BooleanAnswer.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
};

NumericAnswer.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
};

ChoiceAnswer.propTypes = {
  question: PropTypes.shape({
    options: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, text: PropTypes.string })),
  }).isRequired,
  value: PropTypes.any,
};

HeroStat.propTypes = {
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
      ? `Respondida em ${formatDateForDisplay(submittedAt)} · V${anamnesis?.version ?? 1} do Template`
      : `V${anamnesis?.version ?? 1} do Template`;

  return (
    <div>
      {/* Hero */}
      <div className="dossier-hero">
        <div className="dossier-hero-main">
          <div className="dossier-hero-avatar" aria-hidden="true">{initials}</div>
          <div className="dossier-hero-identity">
            <div className="dossier-hero-name">{studentName}</div>
            <div className="dossier-hero-badges">
              {age !== null && <span className="badge">{age} anos</span>}
              {goal && <span className="badge">{goal}</span>}
            </div>
            <div className="dossier-hero-stats">
              <HeroStat label="Peso" value={weight} unit="KG" />
              <HeroStat label="Altura" value={heightRaw} unit="CM" />
              <HeroStat label="IMC" value={bmi} unit="" />
              <HeroStat label="Idade" value={age} unit="" />
            </div>
          </div>
        </div>
        <div className="dossier-meta-bar">
          <span className="dossier-meta-text">{metaText}</span>
        </div>
      </div>

      {/* Shell */}
      <div className="dossier-shell mt-md">
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
            <div className="eyebrow dossier-sidebar-heading">Seções</div>
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

        {/* Action bar */}
        <div className="dossier-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handlePrint}>
            <Printer size={14} strokeWidth={2} aria-hidden="true" />
            Exportar PDF
          </button>
          <div className="dossier-actions-spacer" />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnamnesisResponseDetail;
