import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { getQuestionTypeLabel, ANAMNESIS_QUESTION_TYPE } from '../../constants/anamnesis';
import { getNumericBounds, sortByOrder } from '../../utils/anamnesisAnswers';

const getTrainerName = (trainer) => {
  const user = trainer?.user;
  if (!user) return '—';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || '—';
};

const renderNumericHint = (config) => {
  const { min, max } = getNumericBounds(config);
  const parts = [];
  if (min !== undefined) parts.push(`Mín: ${min}`);
  if (max !== undefined) parts.push(`Máx: ${max}`);
  if (config?.unit) parts.push(`Unidade: ${config.unit}`);
  if (parts.length === 0) return null;
  return <p className="text-sm text-muted anamnesis-question-hint">{parts.join(' · ')}</p>;
};

const renderOptionsHint = (options) => {
  if (!options?.length) return null;
  return (
    <ul className="text-sm text-muted anamnesis-question-options">
      {options.map((option) => (
        <li key={option.id}>{option.text}</li>
      ))}
    </ul>
  );
};

const renderAnswerHint = (question) => {
  switch (question.type) {
    case ANAMNESIS_QUESTION_TYPE.FREE_TEXT:
      return <p className="text-sm text-muted anamnesis-question-hint">Resposta em texto livre</p>;
    case ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS:
      return <p className="text-sm text-muted anamnesis-question-hint">Sim / Não</p>;
    case ANAMNESIS_QUESTION_TYPE.NUMERIC:
      return renderNumericHint(question.config);
    case ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE:
    case ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE:
    case ANAMNESIS_QUESTION_TYPE.MATRIX:
      return renderOptionsHint(question.options);
    default:
      return null;
  }
};

const QuestionItem = ({ question, index }) => (
  <div className="anamnesis-question">
    <div className="anamnesis-question-header">
      <span className="font-medium anamnesis-question-text">{index + 1}. {question.text}</span>
      <div className="anamnesis-question-badges">
        <span className="badge badge-gray">{getQuestionTypeLabel(question.type)}</span>
        {question.required && <span className="badge badge-blue">Obrigatória</span>}
      </div>
    </div>
    {renderAnswerHint(question)}
  </div>
);

QuestionItem.propTypes = {
  question: PropTypes.shape({
    type: PropTypes.string,
    text: PropTypes.string,
    required: PropTypes.bool,
    config: PropTypes.shape({
      min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      max: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      unit: PropTypes.string,
    }),
    options: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, text: PropTypes.string })),
  }).isRequired,
  index: PropTypes.number.isRequired,
};

const SectionAccordion = ({ section }) => {
  const [expanded, setExpanded] = useState(false);
  const sortedQuestions = sortByOrder(section.questions);
  const ChevronIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="anamnesis-accordion">
      <button
        type="button"
        className="anamnesis-accordion-toggle"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={`Seção ${section.title}`}
      >
        <span className="font-medium">{section.title}</span>
        <div className="anamnesis-accordion-meta">
          <span className="text-sm text-muted">{sortedQuestions.length} pergunta(s)</span>
          <ChevronIcon size={16} strokeWidth={2} />
        </div>
      </button>

      {expanded && (
        <div className="anamnesis-accordion-body">
          {sortedQuestions.length === 0 && (
            <p className="text-sm text-muted">Nenhuma pergunta nesta seção.</p>
          )}
          {sortedQuestions.map((question, index) => (
            <QuestionItem key={question.id} question={question} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

SectionAccordion.propTypes = {
  section: PropTypes.shape({
    title: PropTypes.string,
    questions: PropTypes.array,
  }).isRequired,
};

const useExistingResponse = (anamnesisId) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState(null);

  useEffect(() => {
    const fetchResponse = async () => {
      setLoading(true);
      try {
        const result = await api.get(`/my/anamneses/${anamnesisId}/response`);
        setResponse(result.data);
      } catch (error) {
        if (error.response?.status !== 404) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchResponse();
  }, [anamnesisId, showToast]);

  return { loading, response };
};

const getSectionsLabel = (count) => `${count} ${count === 1 ? 'seção' : 'seções'}`;

const AnamnesisCardActions = ({ hasResponse, expanded, sectionCount, onAnswer, onToggle }) => (
  <div className="btn-group anamnesis-card-actions">
    <button type="button" className="btn-primary" onClick={onAnswer}>
      {hasResponse ? 'Atualizar resposta' : 'Responder'}
    </button>
    <button type="button" className="btn-secondary" onClick={onToggle} aria-expanded={expanded}>
      {expanded ? 'Ocultar perguntas' : `Ver perguntas (${getSectionsLabel(sectionCount)})`}
    </button>
  </div>
);

AnamnesisCardActions.propTypes = {
  hasResponse: PropTypes.bool.isRequired,
  expanded: PropTypes.bool.isRequired,
  sectionCount: PropTypes.number.isRequired,
  onAnswer: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

const AnamnesisCard = ({ link }) => {
  const navigate = useNavigate();
  const { anamnesis, trainer, createdAt, anamnesisId } = link;
  const sortedSections = sortByOrder(anamnesis.sections);
  const [expanded, setExpanded] = useState(false);
  const { loading: loadingResponse, response: existingResponse } = useExistingResponse(anamnesisId);

  const formattedDate = createdAt ? new Date(createdAt).toLocaleDateString('pt-BR') : '—';
  const submittedDate = existingResponse?.submittedAt
    ? new Date(existingResponse.submittedAt).toLocaleDateString('pt-BR')
    : null;

  return (
    <div className="card card--mb">
      <div className="card-header">
        <div>
          <h3 className="card-subtitle">{anamnesis.title}</h3>
          {anamnesis.isGeneral && (
            <span className="badge badge-blue anamnesis-card-badge">Geral</span>
          )}
        </div>
      </div>

      {anamnesis.description && (
        <p className="card-description anamnesis-card-description">{anamnesis.description}</p>
      )}

      <div className="text-sm text-muted anamnesis-card-meta">
        <span className="font-medium">Treinador:</span> {getTrainerName(trainer)}
      </div>
      <div className="text-sm text-muted">
        <span className="font-medium">Enviado em:</span> {formattedDate}
      </div>

      {loadingResponse && (
        <p className="text-sm text-muted anamnesis-card-status">Carregando resposta...</p>
      )}

      {!loadingResponse && submittedDate && (
        <p className="text-sm text-muted anamnesis-card-status">Respondido em {submittedDate}</p>
      )}

      {!loadingResponse && (
        <AnamnesisCardActions
          hasResponse={Boolean(existingResponse)}
          expanded={expanded}
          sectionCount={sortedSections.length}
          onAnswer={() => navigate(`/my/anamneses/${anamnesisId}/answer`)}
          onToggle={() => setExpanded((prev) => !prev)}
        />
      )}

      {expanded && (
        <div className="anamnesis-card-sections">
          {sortedSections.length === 0 && (
            <p className="text-sm text-muted">Esta anamnese não possui seções.</p>
          )}
          {sortedSections.map((section) => (
            <SectionAccordion key={section.id} section={section} />
          ))}
        </div>
      )}
    </div>
  );
};

AnamnesisCard.propTypes = {
  link: PropTypes.shape({
    anamnesisId: PropTypes.string,
    createdAt: PropTypes.string,
    anamnesis: PropTypes.shape({
      title: PropTypes.string,
      isGeneral: PropTypes.bool,
      description: PropTypes.string,
      sections: PropTypes.array,
    }),
    trainer: PropTypes.shape({
      user: PropTypes.shape({
        firstName: PropTypes.string,
        lastName: PropTypes.string,
      }),
    }),
  }).isRequired,
};

const MyAnamneses = () => {
  const { showToast } = useToast();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnamneses = async () => {
      setLoading(true);
      try {
        const response = await api.get('/my/anamneses');
        setLinks(response.data);
      } catch (error) {
        showToast(error.userMessage || translateError(error), 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAnamneses();
  }, [showToast]);

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header-title-row">
        <ClipboardList size={24} strokeWidth={2} className="page-header-title-icon" />
        <h1 className="page-title">Minhas Anamneses</h1>
      </div>

      {links.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <ClipboardList size={32} strokeWidth={2} />
          </div>
          <p className="empty-state-title">Nenhuma anamnese ainda</p>
          <p>Seu treinador irá enviar anamneses para você responder.</p>
        </div>
      ) : (
        links.map((link) => (
          <AnamnesisCard key={link.id} link={link} />
        ))
      )}
    </div>
  );
};

export default MyAnamneses;
