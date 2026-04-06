import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import DateInput from '../../components/DateInput';
import PointsSummaryCard from '../../components/PointsSummaryCard';
import PointsBottomSheet from '../../components/PointsBottomSheet';
import {
  PARTICIPANT_MODE,
  PARTICIPANT_MODE_LABEL,
  PARTICIPANT_MODE_VALUES,
  CHALLENGE_NAME_MAX_LENGTH,
  CHALLENGE_MAX_DURATION_DAYS,
} from '../../constants/challenge';
import { DEFAULT_CONFIG } from '../../constants/gamification';
import { POINTS_FIELD_KEYS } from '../../constants/points-fields';

const todayIso = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const daysBetween = (start, end) => {
  if (!start || !end) return null;
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  return Math.floor((endMs - startMs) / 86400000) + 1;
};

const extractPtsValues = (config) => {
  const result = {};
  POINTS_FIELD_KEYS.forEach((key) => {
    result[key] = config[key] ?? DEFAULT_CONFIG[key] ?? null;
  });
  return result;
};

const CreateChallenge = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [participantMode, setParticipantMode] = useState(PARTICIPANT_MODE.ALL);

  // Explicit mode
  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Filter mode
  const [filterGender, setFilterGender] = useState('');
  const [filterMinAge, setFilterMinAge] = useState('');
  const [filterMaxAge, setFilterMaxAge] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterState, setFilterState] = useState('');

  const [previewCount, setPreviewCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dateError, setDateError] = useState('');
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Points state
  const [ptsValues, setPtsValues] = useState(() => extractPtsValues(DEFAULT_CONFIG));
  const [anonymousRanking, setAnonymousRanking] = useState(false);
  const [trainerTemplate, setTrainerTemplate] = useState(null);
  const [showPointsSheet, setShowPointsSheet] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get('/trainer/students')
      .then((r) => { if (mounted) setStudents(r.data || []); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    api.get('/trainer/gamification/config')
      .then((r) => {
        if (!mounted) return;
        const config = r.data || DEFAULT_CONFIG;
        const template = extractPtsValues(config);
        setTrainerTemplate({ ...template, anonymousRanking: !!config.anonymousRanking });
        setPtsValues(template);
        setAnonymousRanking(!!config.anonymousRanking);
      })
      .catch(() => {
        if (!mounted) return;
        const fallback = extractPtsValues(DEFAULT_CONFIG);
        setTrainerTemplate({ ...fallback, anonymousRanking: false });
        showToast('Não foi possível carregar preferências de pontuação. Usando valores padrão.', 'warning');
      });
    return () => { mounted = false; };
  }, [showToast]);

  useEffect(() => {
    setPreviewCount(null);
  }, [participantMode, filterGender, filterMinAge, filterMaxAge, filterCity, filterState, selectedStudentIds.length]);

  const validateDates = () => {
    if (!startDate || !endDate) {
      setDateError('Informe as datas de início e término.');
      return false;
    }
    const today = todayIso();
    if (startDate < today) {
      setDateError('A data de início deve ser hoje ou no futuro.');
      return false;
    }
    if (endDate < startDate) {
      setDateError('A data de término deve ser igual ou após a de início.');
      return false;
    }
    const duration = daysBetween(startDate, endDate);
    if (duration !== null && duration > CHALLENGE_MAX_DURATION_DAYS) {
      setDateError(`A duração máxima é de ${CHALLENGE_MAX_DURATION_DAYS} dias.`);
      return false;
    }
    setDateError('');
    return true;
  };

  const buildPayload = () => {
    const payload = {
      name: name.trim(),
      startDate,
      endDate,
      participantMode,
      ...ptsValues,
      anonymousRanking,
    };
    if (participantMode === PARTICIPANT_MODE.EXPLICIT) {
      payload.studentIds = selectedStudentIds;
    }
    if (participantMode === PARTICIPANT_MODE.FILTER) {
      const filter = {};
      if (filterGender) filter.gender = filterGender;
      if (filterMinAge) filter.minAge = Number.parseInt(filterMinAge, 10);
      if (filterMaxAge) filter.maxAge = Number.parseInt(filterMaxAge, 10);
      if (filterCity) filter.city = filterCity.trim();
      if (filterState) filter.state = filterState.trim();
      payload.filter = filter;
    }
    return payload;
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const payload = buildPayload();
      const previewBody = { mode: participantMode };
      if (payload.filter) previewBody.filter = payload.filter;
      if (payload.studentIds) previewBody.studentIds = payload.studentIds;
      const response = await api.post('/trainer/challenges/preview-participants', previewBody);
      setPreviewCount(response.data.count);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const validateName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('O nome é obrigatório.');
      return false;
    }
    if (trimmed.length > CHALLENGE_NAME_MAX_LENGTH) {
      setNameError(`O nome não pode ter mais de ${CHALLENGE_NAME_MAX_LENGTH} caracteres.`);
      return false;
    }
    setNameError('');
    return true;
  };

  const canSubmit = () => {
    if (submitting) return false;
    if (!name.trim() || !startDate || !endDate) return false;
    if (dateError || nameError) return false;
    if (participantMode !== PARTICIPANT_MODE.ALL && participantMode !== PARTICIPANT_MODE.EXPLICIT && previewCount !== null && previewCount === 0) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateName() || !validateDates()) return;
    setSubmitting(true);
    try {
      const response = await api.post('/trainer/challenges', buildPayload());
      showToast('Campeonato criado!', 'success');
      navigate(`/trainer/challenges/${response.data.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePointsSave = (newValues) => {
    const { anonymousRanking: anon, ...pts } = newValues;
    setPtsValues(pts);
    setAnonymousRanking(!!anon);
    setShowPointsSheet(false);
  };

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const duration = daysBetween(startDate, endDate);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <button
          type="button"
          onClick={() => navigate('/trainer/challenges')}
          className="btn-back"
          aria-label="Voltar para campeonatos"
        >
          <ArrowLeft size={16} strokeWidth={1.6} /> Campeonatos
        </button>
      </div>

      <h1 className="page-title">Novo campeonato</h1>

      <form onSubmit={handleSubmit} className="form">
        <div className="card card--mb">
          <div className="form-group">
            <label className="form-label" htmlFor="ch-name">Nome</label>
            <input
              id="ch-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, CHALLENGE_NAME_MAX_LENGTH))}
              onBlur={validateName}
              className={`form-input${nameError ? ' form-input--error' : ''}`}
              maxLength={CHALLENGE_NAME_MAX_LENGTH}
              disabled={submitting}
              required
            />
            {nameError && <span className="form-error">{nameError}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ch-startDate">Data de início</label>
            <DateInput
              id="ch-startDate"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDateError(''); }}
              className="form-input"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ch-endDate">Data de término</label>
            <DateInput
              id="ch-endDate"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDateError(''); }}
              className="form-input"
              disabled={submitting}
            />
            {duration !== null && duration > 0 && !dateError && (
              <span className="text-sm text-muted">Duração: {duration} dia(s). Máximo: {CHALLENGE_MAX_DURATION_DAYS} dias.</span>
            )}
            {dateError && <span className="form-error">{dateError}</span>}
          </div>
        </div>

        <div className="card card--mb">
          <div className="card-header">
            <h2 className="card-title">Participantes</h2>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ch-mode">Modo de seleção</label>
            <select
              id="ch-mode"
              className="form-select"
              value={participantMode}
              onChange={(e) => setParticipantMode(e.target.value)}
              disabled={submitting}
            >
              {PARTICIPANT_MODE_VALUES.map((m) => (
                <option key={m} value={m}>{PARTICIPANT_MODE_LABEL[m]}</option>
              ))}
            </select>
          </div>

          {participantMode === PARTICIPANT_MODE.EXPLICIT && (
            <div className="form-group">
              <label className="form-label">Selecione os alunos</label>
              {students.length === 0 ? (
                <p className="text-sm text-muted">Você não tem alunos cadastrados.</p>
              ) : (
                <div className="checkbox-list">
                  {students.map((s) => (
                    <label key={s.id} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        disabled={submitting}
                      />
                      {' '}{`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email}
                    </label>
                  ))}
                </div>
              )}
              <span className="text-sm text-muted">{selectedStudentIds.length} selecionado(s)</span>
              {selectedStudentIds.length === 0 && (
                <span className="text-sm text-muted">Você pode adicionar participantes depois de criar o campeonato.</span>
              )}
            </div>
          )}

          {participantMode === PARTICIPANT_MODE.FILTER && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="ch-gender">Gênero</label>
                <select
                  id="ch-gender"
                  className="form-select"
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Qualquer</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ch-minAge">Idade mínima</label>
                <input
                  id="ch-minAge"
                  type="number"
                  min="0"
                  max="120"
                  className="form-input"
                  value={filterMinAge}
                  onChange={(e) => setFilterMinAge(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ch-maxAge">Idade máxima</label>
                <input
                  id="ch-maxAge"
                  type="number"
                  min="0"
                  max="120"
                  className="form-input"
                  value={filterMaxAge}
                  onChange={(e) => setFilterMaxAge(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ch-city">Cidade</label>
                <input
                  id="ch-city"
                  type="text"
                  className="form-input"
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ch-state">Estado</label>
                <input
                  id="ch-state"
                  type="text"
                  className="form-input"
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </>
          )}

          {participantMode !== PARTICIPANT_MODE.EXPLICIT && (
            <div className="btn-group">
              <button
                type="button"
                className="btn-secondary"
                onClick={handlePreview}
                disabled={previewLoading || submitting}
              >
                {previewLoading ? 'Calculando...' : 'Pré-visualizar'}
              </button>
            </div>
          )}

          {previewCount !== null && (
            <p className={`text-sm${previewCount === 0 ? ' form-error' : ' text-muted'}`}>
              {previewCount === 0
                ? 'Nenhum aluno corresponde aos critérios. Ajuste o filtro.'
                : `${previewCount} aluno(s) serão incluídos.`}
            </p>
          )}
        </div>

        <PointsSummaryCard
          values={{ ...ptsValues, anonymousRanking }}
          template={trainerTemplate}
          editable
          onAction={() => setShowPointsSheet(true)}
        />

        <div className="btn-group">
          <button type="submit" className="btn-primary" disabled={!canSubmit()}>
            {submitting ? 'Criando...' : 'Criar campeonato'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/trainer/challenges')}
            disabled={submitting}
          >
            Cancelar
          </button>
        </div>
      </form>

      {showPointsSheet && (
        <PointsBottomSheet
          mode="editable"
          values={{ ...ptsValues, anonymousRanking }}
          template={trainerTemplate}
          onSave={handlePointsSave}
          onClose={() => setShowPointsSheet(false)}
          saving={false}
        />
      )}
    </div>
  );
};

export default CreateChallenge;
