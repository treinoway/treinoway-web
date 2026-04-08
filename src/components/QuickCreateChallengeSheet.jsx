import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Target,
  Trophy,
  PlusCircle,
  ArrowLeft,
  X,
  CalendarDays,
  Users,
  Dumbbell,
  CalendarCheck,
  Flame,
  Medal,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';
import PointsBottomSheet from './PointsBottomSheet';
import { PARTICIPANT_MODE, CHALLENGE_NAME_MAX_LENGTH } from '../constants/challenge';
import { DEFAULT_CONFIG } from '../constants/gamification';
import { POINTS_FIELD_KEYS } from '../constants/points-fields';

const TEMPLATE_CARDS = [
  {
    key: 'sprint-7',
    title: 'Sprint de 7 dias',
    description: 'Competição rápida para manter o ritmo',
    icon: Zap,
    badge: 'Rápido',
    badgeClass: 'badge-blue',
    durationDays: 7,
    defaultName: 'Sprint Semanal',
  },
  {
    key: 'bi-weekly',
    title: 'Desafio quinzenal',
    description: 'Duas semanas focadas em consistência',
    icon: Target,
    badge: 'Popular',
    badgeClass: 'badge-green',
    durationDays: 14,
    defaultName: 'Desafio 14 Dias',
  },
  {
    key: 'monthly',
    title: 'Campeonato mensal',
    description: 'Um mês completo com ranking acumulado',
    icon: Trophy,
    badge: 'Consistência',
    badgeClass: 'badge-gray',
    durationDays: 30,
    defaultName: 'Campeonato do Mês',
  },
];

const SCORING_RULES = [
  { key: 'ptsWorkoutCompleted', label: 'Treino completo', icon: Dumbbell },
  { key: 'ptsDailyCheckin', label: 'Check-in diário', icon: CalendarCheck },
  { key: 'ptsStreak7Days', label: 'Sequência de 7 dias', icon: Flame },
];

const MOCK_RANKING = [
  { position: '1º', name: 'Aluno A', points: 120, color: '#D4A017' },
  { position: '2º', name: 'Aluno B', points: 95, color: '#8E8E93' },
  { position: '3º', name: 'Aluno C', points: 80, color: '#CD7F32' },
];

const todayIso = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (isoDate, days) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days - 1);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const extractPtsValues = (config) => {
  const result = {};
  POINTS_FIELD_KEYS.forEach((key) => {
    result[key] = config[key] ?? DEFAULT_CONFIG[key] ?? null;
  });
  return result;
};

const QuickCreateChallengeSheet = ({ onClose, onCreated }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [presetNames, setPresetNames] = useState({});
  const [nameError, setNameError] = useState(null);
  const [activeCount, setActiveCount] = useState(null);
  const [creating, setCreating] = useState(false);
  const [trainerTemplate, setTrainerTemplate] = useState(null);
  const [ptsValues, setPtsValues] = useState(null);
  const [showPointsEditor, setShowPointsEditor] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.post('/trainer/challenges/preview-participants', { mode: PARTICIPANT_MODE.ALL })
      .then((r) => { if (mounted) setActiveCount(r.data?.count ?? null); })
      .catch(() => {});
    api.get('/trainer/gamification/config')
      .then((r) => {
        if (!mounted) return;
        const config = r.data || DEFAULT_CONFIG;
        setTrainerTemplate({ ...extractPtsValues(config), anonymousRanking: !!config.anonymousRanking });
      })
      .catch(() => {
        if (mounted) setTrainerTemplate({ ...extractPtsValues(DEFAULT_CONFIG), anonymousRanking: false });
      });
    return () => { mounted = false; };
  }, []);

  const handleSelectPreset = (preset) => {
    setPresetNames((prev) => ({
      ...prev,
      [preset.key]: prev[preset.key] ?? preset.defaultName,
    }));
    setSelectedPreset(preset);
    setNameError(null);
  };

  const handleBack = () => {
    setSelectedPreset(null);
    setNameError(null);
  };

  const handleCustomize = () => {
    onClose();
    navigate('/trainer/challenges/new');
  };

  const handleCreate = async () => {
    const name = (presetNames[selectedPreset.key] ?? selectedPreset.defaultName).trim();
    if (!name) {
      setNameError('Nome é obrigatório');
      return;
    }
    setCreating(true);
    try {
      const start = todayIso();
      const end = addDays(start, selectedPreset.durationDays);
      const body = {
        name,
        startDate: start,
        endDate: end,
        participantMode: PARTICIPANT_MODE.ALL,
      };
      const pts = ptsValues || previewValues;
      POINTS_FIELD_KEYS.forEach((key) => {
        if (pts[key] !== undefined && pts[key] !== null) body[key] = pts[key];
      });
      body.anonymousRanking = !!pts.anonymousRanking;
      const response = await api.post('/trainer/challenges', body);
      showToast('Campeonato criado! Editar agora.', 'success');
      onCreated?.(response.data.id);
      onClose();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handlePointsSave = (newValues) => {
    const { anonymousRanking, ...pts } = newValues;
    setPtsValues({ ...pts, anonymousRanking: !!anonymousRanking });
    setShowPointsEditor(false);
  };

  const previewValues = trainerTemplate || extractPtsValues(DEFAULT_CONFIG);
  const currentPts = ptsValues || previewValues;

  const participantInfo = () => {
    if (activeCount === null) return 'Calculando participantes...';
    if (activeCount === 0) return null;
    return `${activeCount} alunos participam`;
  };

  const renderTemplateSelection = () => (
    <>
      <div className="bottom-sheet-header">
        <h3 className="bottom-sheet-title">Novo campeonato</h3>
        <button
          type="button"
          className="bottom-sheet-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
      </div>
      <div className="bottom-sheet-body">
        <p className="text-sm text-muted mb-md">Escolha um modelo para começar</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {TEMPLATE_CARDS.map((card) => {
            const IconComponent = card.icon;
            return (
              <button
                key={card.key}
                type="button"
                className="challenge-template-card"
                onClick={() => handleSelectPreset(card)}
                aria-label={card.title}
              >
                <div className="challenge-template-card__icon">
                  <IconComponent size={20} />
                </div>
                <div className="challenge-template-card__text">
                  <div className="challenge-template-card__title">{card.title}</div>
                  <div className="challenge-template-card__desc">{card.description}</div>
                </div>
                <span className={`badge ${card.badgeClass} challenge-template-card__badge`}>
                  {card.badge}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            className="challenge-template-card challenge-template-card--secondary"
            onClick={handleCustomize}
            aria-label="Criar do zero"
          >
            <div className="challenge-template-card__icon">
              <PlusCircle size={20} />
            </div>
            <div className="challenge-template-card__text">
              <div className="challenge-template-card__title">Criar do zero</div>
              <div className="challenge-template-card__desc">Configure tudo manualmente</div>
            </div>
          </button>
        </div>
      </div>
    </>
  );

  const renderConfirmation = () => {
    const info = participantInfo();
    return (
      <>
        <div className="bottom-sheet-header">
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={handleBack}
            aria-label="Voltar"
            style={{ marginRight: 'auto' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h3 className="bottom-sheet-title">{selectedPreset.title}</h3>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="bottom-sheet-body">
          <div className="form-group mb-md">
            <label className="form-label" htmlFor="challenge-name">
              Nome do campeonato
            </label>
            <input
              id="challenge-name"
              className={`form-input${nameError ? ' form-input--error' : ''}`}
              type="text"
              value={presetNames[selectedPreset.key] ?? selectedPreset.defaultName}
              maxLength={CHALLENGE_NAME_MAX_LENGTH}
              onChange={(e) => {
                setPresetNames((prev) => ({ ...prev, [selectedPreset.key]: e.target.value }));
                if (nameError) setNameError(null);
              }}
            />
            {nameError && <span className="form-error">{nameError}</span>}
          </div>

          <div className="challenge-confirm-info">
            <div className="challenge-confirm-info__row">
              <CalendarDays size={16} />
              <span>
                {selectedPreset.durationDays} dias · Início hoje
              </span>
            </div>
            <div className="challenge-confirm-info__row">
              <Users size={16} />
              {info ? (
                <span>{info}</span>
              ) : (
                <span className="text-muted">
                  Você poderá adicionar alunos após criar o campeonato
                </span>
              )}
            </div>
          </div>

          <div className="challenge-confirm-scoring">
            <div className="challenge-confirm-scoring__header">
              <span className="challenge-confirm-scoring__title">Regras de pontuação</span>
              <button
                type="button"
                className="btn-link"
                onClick={() => setShowPointsEditor(true)}
                aria-label="Editar regras de pontuação"
              >
                Editar
              </button>
            </div>
            {SCORING_RULES.map(({ key, label, icon: RuleIcon }) => (
              <div key={key} className="challenge-scoring-rule">
                <RuleIcon size={18} className="challenge-scoring-rule__icon" />
                <span className="challenge-scoring-rule__label">{label}</span>
                <span className="challenge-scoring-rule__value">
                  {currentPts[key] != null ? `+${currentPts[key]} pts` : '--'}
                </span>
              </div>
            ))}
          </div>

          <div className="challenge-confirm-ranking">
            <div className="challenge-confirm-ranking__title">Como vai funcionar</div>
            {MOCK_RANKING.map((row) => (
              <div key={row.position} className="challenge-ranking-row">
                <Medal size={16} style={{ color: row.color, flexShrink: 0 }} />
                <span className="challenge-ranking-row__position">{row.position}</span>
                <span className="challenge-ranking-row__name">{row.name}</span>
                <span className="challenge-ranking-row__points">{row.points} pts</span>
              </div>
            ))}
            <p className="challenge-confirm-caption">
              Ranking atualizado em tempo real
              {' '}para todos os participantes
            </p>
          </div>

          <button
            type="button"
            className="btn-primary btn-primary-full"
            onClick={handleCreate}
            disabled={creating}
          >
            <Trophy size={18} />
            {creating ? 'Lançando...' : 'Lançar campeonato'}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="overlay">
      <div className="bottom-sheet bottom-sheet--large" onClick={(e) => e.stopPropagation()}>
        {selectedPreset ? renderConfirmation() : renderTemplateSelection()}
      </div>

      {showPointsEditor && (
        <PointsBottomSheet
          mode="editable"
          values={currentPts}
          template={previewValues}
          onSave={handlePointsSave}
          onClose={() => setShowPointsEditor(false)}
        />
      )}
    </div>
  );
};

QuickCreateChallengeSheet.propTypes = {
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func,
};

export default QuickCreateChallengeSheet;
