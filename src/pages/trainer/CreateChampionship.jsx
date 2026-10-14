import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import BrandCalendar, { todayIso } from '../../components/BrandCalendar';

const DEFAULT_RULES = [
  { event: 'workout_completed', label: 'Treino concluído', description: 'Por cada treino registrado', points: 10 },
  { event: 'checkin', label: 'Check-in diário', description: 'Por cada check-in realizado', points: 2 },
  { event: 'streak_7d', label: 'Sequência 7 dias', description: 'Bônus por consistência semanal', points: 50 },
];

const DURATION_OPTIONS = [
  { label: '7 dias', value: 7 },
  { label: '15 dias', value: 15 },
  { label: '30 dias', value: 30 },
  { label: 'Personalizado', value: null },
];

const addDays = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const CreateChampionship = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  const [selectedDuration, setSelectedDuration] = useState(7);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');

  const [participantMode, setParticipantMode] = useState('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [totalActiveStudents, setTotalActiveStudents] = useState(0);

  const [scoringRules, setScoringRules] = useState(() =>
    DEFAULT_RULES.map((r) => ({ ...r }))
  );
  const [scoringError, setScoringError] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get('/trainer/students')
      .then((r) => {
        if (!mounted) return;
        const data = r.data || [];
        setTotalActiveStudents(data.length);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const computedEndDate = selectedDuration !== null && startDate
    ? addDays(startDate, selectedDuration)
    : endDate;

  const handleDurationSelect = (value) => {
    setSelectedDuration(value);
    if (value !== null && startDate) {
      setEndDate('');
    }
    setEndDateError('');
  };

  const handleStartDateChange = (iso) => {
    setStartDate(iso || '');
    setStartDateError('');
    setEndDateError('');
  };

  const handleEndDateChange = (iso) => {
    setEndDate(iso || '');
    setEndDateError('');
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (nameError) setNameError('');
  };

  const handleParticipantModeChange = (mode) => {
    setParticipantMode(mode);
    setSelectedStudentIds([]);
  };

  const handleRulePointsChange = (index, value) => {
    setScoringRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, points: value } : r))
    );
    if (scoringError) setScoringError('');
  };

  const handleSubmit = async () => {
    let hasError = false;

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 3) {
      setNameError('Nome deve ter pelo menos 3 caracteres');
      hasError = true;
    }

    if (!startDate) {
      setStartDateError('Data de início é obrigatória');
      hasError = true;
    }

    const resolvedEndDate = selectedDuration !== null && startDate
      ? addDays(startDate, selectedDuration)
      : endDate;

    if (!resolvedEndDate) {
      setEndDateError('Data de término é obrigatória');
      hasError = true;
    } else if (resolvedEndDate <= startDate) {
      setEndDateError('Data de término deve ser após a data de início');
      hasError = true;
    }

    const validRules = scoringRules.filter((r) => Number(r.points) > 0);
    if (validRules.length === 0) {
      setScoringError('Pelo menos uma regra deve ter pontuação maior que 0');
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        startDate,
        endDate: resolvedEndDate,
        participantMode,
        ptsWorkoutCompleted: scoringRules.find((r) => r.event === 'workout_completed')?.points ?? 0,
        ptsDailyCheckin: scoringRules.find((r) => r.event === 'checkin')?.points ?? 0,
        ptsStreak7Days: scoringRules.find((r) => r.event === 'streak_7d')?.points ?? 0,
      };
      if (participantMode === 'manual') {
        payload.studentIds = selectedStudentIds;
      }
      const response = await api.post('/trainer/challenges', payload);
      showToast('Campeonato criado!', 'success');
      navigate(`/trainer/challenges/${response.data.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const participantCount = participantMode === 'all'
    ? totalActiveStudents
    : selectedStudentIds.length;

  const participantDescription = participantMode === 'all'
    ? 'Todos os seus alunos ativos participarão'
    : selectedStudentIds.length === 0
      ? 'Nenhum aluno selecionado'
      : `${selectedStudentIds.length} aluno(s) selecionado(s)`;

  const isManualWithNoStudents = participantMode === 'manual' && selectedStudentIds.length === 0;

  const endDateValue = selectedDuration !== null && startDate
    ? computedEndDate
    : endDate;

  const isEndDateDisabled = selectedDuration !== null;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <button
          type="button"
          onClick={() => navigate('/trainer/challenges')}
          className="btn-back"
          aria-label="Voltar para campeonatos"
        >
          <ArrowLeft size={16} strokeWidth={1.6} /> Campeonatos
        </button>
      </div>

      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 className="page-title">Novo campeonato</h1>
        <p className="text-muted" style={{ fontSize: 'var(--font-body-small-size)' }}>
          Configure como quiser — pode editar tudo depois
        </p>
      </div>

      {/* Section 1 — Informações básicas */}
      <div className="card card--mb">
        <div className="section-header">
          <span className="section-badge" aria-hidden="true">1</span>
          <h2 className="card-title">Informações básicas</h2>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cs-name">Nome do campeonato</label>
          <input
            id="cs-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            className={`form-input${nameError ? ' form-input--error' : ''}`}
            placeholder="Ex: Desafio de janeiro"
            disabled={submitting}
          />
          {nameError && <span className="form-error">{nameError}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Duração</label>
          <div className="pill-group" role="group" aria-label="Duração do campeonato">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                className={`pill-btn${selectedDuration === opt.value ? ' pill-btn--active' : ''}`}
                onClick={() => handleDurationSelect(opt.value)}
                aria-pressed={selectedDuration === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="date-row">
          <div className="form-group">
            <label className="form-label" htmlFor="cs-startDate">Início</label>
            <BrandCalendar
              mode="single"
              id="cs-startDate"
              label="Início"
              value={startDate}
              onChange={handleStartDateChange}
              minDate={todayIso()}
              error={!!startDateError}
              disabled={submitting}
              required
            />
            {startDateError && (
              <span id="cs-startDate-error" className="form-error" role="alert">
                {startDateError}
              </span>
            )}
          </div>

          <span className="date-row__separator" aria-hidden="true">→</span>

          <div className="form-group">
            <label className="form-label" htmlFor="cs-endDate">
              Término {isEndDateDisabled ? '(calculado)' : ''}
            </label>
            <BrandCalendar
              mode="single"
              id="cs-endDate"
              label="Término"
              value={endDateValue}
              onChange={handleEndDateChange}
              minDate={startDate || todayIso()}
              error={!!endDateError}
              disabled={submitting || isEndDateDisabled}
              required
            />
            {endDateError && (
              <span id="cs-endDate-error" className="form-error" role="alert">
                {endDateError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 2 — Participantes */}
      <div className="card card--mb">
        <div className="section-header">
          <span className="section-badge" aria-hidden="true">2</span>
          <h2 className="card-title">Participantes</h2>
          <span className="section-header__right">Opcional — pode adicionar depois</span>
        </div>

        <div className="form-group">
          <div className="segmented-toggle" role="group" aria-label="Modo de participantes">
            <button
              type="button"
              className={`segmented-toggle-btn${participantMode === 'all' ? ' segmented-toggle-btn--active' : ''}`}
              onClick={() => handleParticipantModeChange('all')}
              aria-pressed={participantMode === 'all'}
            >
              Todos os alunos
            </button>
            <button
              type="button"
              className={`segmented-toggle-btn${participantMode === 'manual' ? ' segmented-toggle-btn--active' : ''}`}
              onClick={() => handleParticipantModeChange('manual')}
              aria-pressed={participantMode === 'manual'}
            >
              Selecionar manualmente
            </button>
          </div>
        </div>

        <div
          className={`participant-preview${isManualWithNoStudents ? ' participant-preview--clickable' : ''}`}
          role={isManualWithNoStudents ? 'button' : undefined}
          tabIndex={isManualWithNoStudents ? 0 : undefined}
          aria-label={isManualWithNoStudents ? 'Selecionar alunos' : undefined}
        >
          <div className="participant-avatar">{participantCount}</div>
          <div className="participant-preview__info">
            <span className="participant-preview__count">{participantCount} aluno(s) incluído(s)</span>
            <span className="participant-preview__description">{participantDescription}</span>
          </div>
        </div>
      </div>

      {/* Section 3 — Pontuação */}
      <div className="card card--mb">
        <div className="section-header">
          <span className="section-badge" aria-hidden="true">3</span>
          <h2 className="card-title">Pontuação</h2>
        </div>

        <div className="scoring-rules-list">
          {scoringRules.map((rule, index) => (
            <div key={rule.event} className="scoring-rule-row">
              <div className="scoring-rule-row__info">
                <span className="scoring-rule-row__label">{rule.label}</span>
                <span className="scoring-rule-row__description">{rule.description}</span>
              </div>
              <div className="scoring-rule-row__input-group">
                <input
                  type="number"
                  className="scoring-rule-row__input"
                  value={rule.points}
                  onChange={(e) => handleRulePointsChange(index, e.target.value)}
                  min="0"
                  aria-label={`Pontos para ${rule.label}`}
                />
                <span className="scoring-rule-row__unit">pts</span>
              </div>
            </div>
          ))}
        </div>

        {scoringError && (
          <span className="form-error" style={{ marginTop: 'var(--spacing-sm)', display: 'block' }}>
            {scoringError}
          </span>
        )}

        <button
          type="button"
          className="btn-customize-scratch"
          onClick={() => {}}
        >
          <Plus size={16} />
          Adicionar regra
        </button>
      </div>

      {/* Footer actions */}
      <div className="btn-group" style={{ marginTop: 'var(--spacing-xl)' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/trainer/challenges')}
          disabled={submitting}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Criando...' : 'Criar campeonato'}
        </button>
      </div>
    </div>
  );
};

export default CreateChampionship;
