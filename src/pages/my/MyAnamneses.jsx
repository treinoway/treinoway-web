import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { getQuestionTypeLabel, ANAMNESIS_QUESTION_TYPE } from '../../constants/anamnesis';

const getTrainerName = (trainer) => {
  const user = trainer?.user;
  if (!user) return '—';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || '—';
};

const QuestionItem = ({ question, index }) => {
  const typeLabel = getQuestionTypeLabel(question.type);

  const renderAnswerHint = () => {
    switch (question.type) {
      case ANAMNESIS_QUESTION_TYPE.FREE_TEXT:
        return <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>Resposta em texto livre</p>;
      case ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS:
        return <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>Sim / Não</p>;
      case ANAMNESIS_QUESTION_TYPE.NUMERIC: {
        const config = question.config ?? {};
        const parts = [];
        if (config.min !== undefined) parts.push(`Mín: ${config.min}`);
        if (config.max !== undefined) parts.push(`Máx: ${config.max}`);
        if (config.unit) parts.push(`Unidade: ${config.unit}`);
        return parts.length > 0
          ? <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>{parts.join(' · ')}</p>
          : null;
      }
      case ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE:
      case ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE:
      case ANAMNESIS_QUESTION_TYPE.MATRIX:
        if (!question.options?.length) return null;
        return (
          <ul className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)', paddingLeft: 'var(--spacing-md)' }}>
            {question.options.map((opt) => (
              <li key={opt.id}>{opt.text}</li>
            ))}
          </ul>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: 'var(--md-surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-outline-variant)',
        marginBottom: 'var(--spacing-sm)',
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <span className="font-medium" style={{ flex: 1 }}>{index + 1}. {question.text}</span>
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', flexShrink: 0 }}>
          <span className="badge badge-gray">{typeLabel}</span>
          {question.required && <span className="badge badge-blue">Obrigatória</span>}
        </div>
      </div>
      {renderAnswerHint()}
    </div>
  );
};

const SectionAccordion = ({ section }) => {
  const [expanded, setExpanded] = useState(false);
  const sortedQuestions = [...(section.questions ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div
      style={{
        border: '1px solid var(--color-outline-variant)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--spacing-sm)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          background: 'var(--md-surface)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        aria-expanded={expanded}
        aria-label={`Seção ${section.title}`}
      >
        <span className="font-medium">{section.title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <span className="text-sm text-muted">{sortedQuestions.length} pergunta(s)</span>
          {expanded ? <ChevronUp size={16} strokeWidth={1.6} /> : <ChevronDown size={16} strokeWidth={1.6} />}
        </div>
      </button>

      {expanded && sortedQuestions.length > 0 && (
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--md-primary-container)' }}>
          {sortedQuestions.map((question, index) => (
            <QuestionItem key={question.id} question={question} index={index} />
          ))}
        </div>
      )}

      {expanded && sortedQuestions.length === 0 && (
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--md-primary-container)' }}>
          <p className="text-sm text-muted">Nenhuma pergunta nesta seção.</p>
        </div>
      )}
    </div>
  );
};

const QuestionAnswerField = ({ question, index, value, onChange, error }) => {
  const { type, options, config, text, required } = question;

  const renderField = () => {
    switch (type) {
      case ANAMNESIS_QUESTION_TYPE.FREE_TEXT:
        return (
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="form-textarea"
            rows={3}
            placeholder="Sua resposta..."
            aria-label={`Resposta para: ${text}`}
          />
        );

      case ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS:
        return (
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`q-${question.id}`}
                value="yes"
                checked={value === 'yes'}
                onChange={() => onChange('yes')}
              />
              Sim
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`q-${question.id}`}
                value="no"
                checked={value === 'no'}
                onChange={() => onChange('no')}
              />
              Não
            </label>
          </div>
        );

      case ANAMNESIS_QUESTION_TYPE.NUMERIC: {
        const min = config?.min;
        const max = config?.max;
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="form-input"
            min={min}
            max={max}
            placeholder="Valor numérico..."
            aria-label={`Resposta para: ${text}`}
          />
        );
      }

      case ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE:
      case ANAMNESIS_QUESTION_TYPE.MATRIX:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            {(options ?? []).map((opt) => (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt.text}
                  checked={value === opt.text}
                  onChange={() => onChange(opt.text)}
                />
                {opt.text}
              </label>
            ))}
          </div>
        );

      case ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE: {
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            {(options ?? []).map((opt) => (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  value={opt.text}
                  checked={selectedValues.includes(opt.text)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedValues, opt.text]);
                    } else {
                      onChange(selectedValues.filter((v) => v !== opt.text));
                    }
                  }}
                  aria-label={opt.text}
                />
                {opt.text}
              </label>
            ))}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div style={{ marginBottom: 'var(--spacing-md)' }}>
      <p className="form-label" style={{ marginBottom: 'var(--spacing-xs)' }}>
        {index + 1}. {text}
        {required && <span style={{ color: 'var(--md-error)', marginLeft: 'var(--spacing-xs)' }}>*</span>}
      </p>
      {renderField()}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

const AnamnesisCard = ({ link }) => {
  const { showToast } = useToast();
  const { anamnesis, trainer, createdAt } = link;
  const anamnesisId = link.anamnesisId;
  const sortedSections = [...(anamnesis.sections ?? [])].sort((a, b) => a.order - b.order);

  const [expanded, setExpanded] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(true);
  const [existingResponse, setExistingResponse] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formAnswers, setFormAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('pt-BR')
    : '—';

  const allQuestions = sortedSections.flatMap((s) =>
    [...(s.questions ?? [])].sort((a, b) => a.order - b.order)
  );

  useEffect(() => {
    const fetchResponse = async () => {
      setLoadingResponse(true);
      try {
        const response = await api.get(`/my/anamneses/${anamnesisId}/response`);
        setExistingResponse(response.data);
      } catch (error) {
        if (error.response?.status !== 404) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      } finally {
        setLoadingResponse(false);
      }
    };
    fetchResponse();
  }, [anamnesisId, showToast]);

  const buildInitialAnswers = (responseData) => {
    if (!responseData) return {};
    return responseData.answers.reduce((acc, answer) => {
      acc[answer.questionId] = answer.value;
      return acc;
    }, {});
  };

  const handleOpenForm = () => {
    setFormAnswers(buildInitialAnswers(existingResponse));
    setValidationErrors({});
    setShowForm(true);
  };

  const handleAnswerChange = (questionId, value) => {
    setFormAnswers((prev) => ({ ...prev, [questionId]: value }));
    setValidationErrors((prev) => ({ ...prev, [questionId]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setValidationErrors({});

    const answers = allQuestions
      .filter((q) => {
        const val = formAnswers[q.id];
        if (val === undefined || val === null || val === '') return false;
        if (Array.isArray(val) && val.length === 0) return false;
        return true;
      })
      .map((q) => ({ questionId: q.id, value: formAnswers[q.id] }));

    try {
      const response = await api.post(`/my/anamneses/${anamnesisId}/response`, { answers });
      setExistingResponse(response.data);
      setShowForm(false);
      showToast('Resposta enviada com sucesso!', 'success');
    } catch (error) {
      const details = error.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        const errors = details.reduce((acc, detail) => {
          acc[detail.questionId] = detail.message;
          return acc;
        }, {});
        setValidationErrors(errors);
      } else {
        showToast(error.userMessage || translateError(error), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submittedDate = existingResponse?.submittedAt
    ? new Date(existingResponse.submittedAt).toLocaleDateString('pt-BR')
    : null;

  return (
    <div className="card card--mb">
      <div className="card-header">
        <div>
          <h3 className="card-subtitle">{anamnesis.title}</h3>
          {anamnesis.isGeneral && (
            <span className="badge badge-blue" style={{ marginTop: 'var(--spacing-xs)' }}>Geral</span>
          )}
        </div>
      </div>

      {anamnesis.description && (
        <p className="card-description" style={{ marginTop: 'var(--spacing-xs)' }}>{anamnesis.description}</p>
      )}

      <div className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
        <span className="font-medium">Treinador:</span> {getTrainerName(trainer)}
      </div>
      <div className="text-sm text-muted">
        <span className="font-medium">Enviado em:</span> {formattedDate}
      </div>

      {loadingResponse && (
        <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-sm)' }}>
          Carregando resposta...
        </p>
      )}

      {!loadingResponse && submittedDate && !showForm && (
        <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-sm)' }}>
          Respondido em {submittedDate}
        </p>
      )}

      {!loadingResponse && !showForm && (
        <div className="btn-group" style={{ marginTop: 'var(--spacing-md)' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenForm}
          >
            {existingResponse ? 'Atualizar resposta' : 'Responder'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setExpanded((p) => !p)}
            aria-expanded={expanded}
          >
            {expanded ? 'Ocultar perguntas' : `Ver perguntas (${sortedSections.length} ${sortedSections.length === 1 ? 'seção' : 'seções'})`}
          </button>
        </div>
      )}

      {!loadingResponse && showForm && (
        <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-outline-variant)' }}>
          <form onSubmit={handleSubmit} className="form">
            {sortedSections.map((section) => {
              const sectionQuestions = [...(section.questions ?? [])].sort((a, b) => a.order - b.order);
              return (
                <div key={section.id} style={{ marginBottom: 'var(--spacing-md)' }}>
                  <h4 className="font-medium" style={{ marginBottom: 'var(--spacing-sm)' }}>{section.title}</h4>
                  {sectionQuestions.map((question, index) => (
                    <QuestionAnswerField
                      key={question.id}
                      question={question}
                      index={index}
                      value={formAnswers[question.id]}
                      onChange={(val) => handleAnswerChange(question.id, val)}
                      error={validationErrors[question.id]}
                    />
                  ))}
                </div>
              );
            })}
            <div className="btn-group">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Enviando...' : 'Enviar resposta'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={submitting}
                onClick={() => { setShowForm(false); setValidationErrors({}); }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {expanded && !showForm && (
        <div style={{ marginTop: 'var(--spacing-md)' }}>
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
      <h1 className="page-title">Minhas Anamneses</h1>

      {links.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ClipboardList size={48} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">Nenhuma anamnese ainda</p>
          <p>Seu treinador irá enviar anamneses para você responder</p>
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
