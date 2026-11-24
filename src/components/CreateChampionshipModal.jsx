import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { X, Dumbbell, MapPin, Flame, Plus } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';
import PointsBottomSheet from './PointsBottomSheet';
import ConfirmDialog from './ds/ConfirmDialog';
import Modal from './ds/Modal';
import useConfirmDialog from '../hooks/useConfirmDialog';
import WeeklyChampionshipForm from './challenge/WeeklyChampionshipForm';
import useConsistencyRankingAccess from '../hooks/useConsistencyRankingAccess';
import { PARTICIPANT_MODE } from '../constants/challenge';
import { DEFAULT_CONFIG } from '../constants/gamification';
import { POINTS_FIELD_KEYS } from '../constants/points-fields';

const TEMPLATES = [
  {
    id: 'sprint_7d',
    name: 'Sprint de 7 dias',
    description: 'Competição rápida para manter o engajamento',
    duration_days: 7,
    default_championship_name: 'Sprint Semanal',
    badge: 'Popular',
    scoring_rules: [
      { event: 'workout_completed', points: 10 },
      { event: 'checkin', points: 2 },
      { event: 'streak_7d', points: 50 },
    ],
  },
  {
    id: 'biweekly',
    name: 'Desafio quinzenal',
    description: 'Duas semanas focadas em consistência',
    duration_days: 15,
    default_championship_name: 'Desafio 15 Dias',
    scoring_rules: [
      { event: 'workout_completed', points: 15 },
      { event: 'checkin', points: 3 },
      { event: 'streak_7d', points: 80 },
    ],
  },
  {
    id: 'monthly',
    name: 'Campeonato mensal',
    description: 'Um mês com ranking acumulado',
    duration_days: 30,
    default_championship_name: 'Campeonato do Mês',
    scoring_rules: [
      { event: 'workout_completed', points: 20 },
      { event: 'checkin', points: 5 },
      { event: 'streak_7d', points: 150 },
    ],
  },
];

const EVENT_LABELS = {
  workout_completed: 'Treino',
  checkin: 'Check-in',
  streak_7d: 'Seq. 7d',
  streak_14d: 'Seq. 14d',
  streak_30d: 'Seq. 30d',
};

const EVENT_ICONS = {
  workout_completed: Dumbbell,
  checkin: MapPin,
  streak_7d: Flame,
  streak_14d: Flame,
  streak_30d: Flame,
};


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

const CollapsedRules = ({ ptsValues }) => {
  const text = DISPLAY_RULES
    .map(({ event, ptsKey }) => `${EVENT_LABELS[event]}: ${ptsValues[ptsKey] ?? 0}`)
    .join(' · ');
  return <p className="championship-template-card__collapsed-rules">{text}</p>;
};

CollapsedRules.propTypes = {
  ptsValues: PropTypes.object.isRequired,
};

const DISPLAY_RULES = [
  { event: 'workout_completed', ptsKey: 'ptsWorkoutCompleted' },
  { event: 'checkin', ptsKey: 'ptsDailyCheckin' },
  { event: 'streak_7d', ptsKey: 'ptsStreak7Days' },
];

const ScoringCards = ({ ptsValues }) => (
  <div className="championship-scoring-cards">
    {DISPLAY_RULES.map(({ event, ptsKey }) => {
      const IconComponent = EVENT_ICONS[event] ?? Dumbbell;
      return (
        <div key={event} className="championship-scoring-card">
          <div className="championship-scoring-card__label">
            <IconComponent size={12} />
            {EVENT_LABELS[event] ?? event}
          </div>
          <div className="championship-scoring-card__value">{ptsValues[ptsKey] ?? 0}</div>
        </div>
      );
    })}
  </div>
);

ScoringCards.propTypes = {
  ptsValues: PropTypes.object.isRequired,
};

const DISCARD_MESSAGE = 'Há mudanças não salvas. Descartar e sair?';

// Closing (close button, overlay, Cancelar and, when `listenEscape`, Escape) that first asks before discarding unsaved changes
const useDiscardGuard = (listenEscape, hasChanges, onClose) => {
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const asking = dialogProps !== null;
  const handleRequestClose = useCallback(() => {
    if (!hasChanges) {
      onClose();
      return;
    }
    requestConfirm({ message: DISCARD_MESSAGE, confirmLabel: 'Descartar', busyLabel: 'Saindo...', onConfirm: onClose });
  }, [hasChanges, onClose, requestConfirm]);

  useEffect(() => {
    if (!listenEscape || asking) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleRequestClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [listenEscape, asking, handleRequestClose]);

  return { dialogProps, handleRequestClose };
};

const CreateChampionshipModal = ({ isOpen, onClose, onCreated }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState('sprint_7d');
  const [championshipName, setChampionshipName] = useState(
    TEMPLATES[0].default_championship_name
  );
  const [nameError, setNameError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [trainerTemplate, setTrainerTemplate] = useState(null);
  const [ptsValues, setPtsValues] = useState(null);
  const [showPointsEditor, setShowPointsEditor] = useState(false);
  const weeklyFormat = useConsistencyRankingAccess();
  const [weeklyDirty, setWeeklyDirty] = useState(false);
  const hasUnsavedWeekly = weeklyFormat && weeklyDirty;
  const { dialogProps, handleRequestClose } = useDiscardGuard(isOpen && !weeklyFormat, hasUnsavedWeekly, onClose);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    api.get('/trainer/gamification/config')
      .then((r) => {
        if (!mounted) return;
        const config = r.data || DEFAULT_CONFIG;
        setTrainerTemplate({ ...extractPtsValues(config), anonymousRanking: !!config.anonymousRanking });
      })
      .catch(() => {
        if (mounted) setTrainerTemplate({ ...extractPtsValues(DEFAULT_CONFIG), anonymousRanking: false });
      });
    api.post('/trainer/challenges/preview-participants', { mode: PARTICIPANT_MODE.ALL })
      .catch(() => {});
    return () => { mounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId);
  const currentPts = ptsValues || trainerTemplate || extractPtsValues(DEFAULT_CONFIG);

  const handleSelectTemplate = (templateId) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    setSelectedTemplateId(templateId);
    setChampionshipName(template.default_championship_name);
    setNameError(null);
  };

  const handleCreate = async () => {
    const trimmedName = championshipName.trim();
    if (!trimmedName) {
      setNameError('Nome é obrigatório');
      return;
    }
    setCreating(true);
    try {
      const today = todayIso();
      const end = addDays(today, selectedTemplate.duration_days);
      const body = {
        name: trimmedName,
        startDate: today,
        endDate: end,
        participantMode: PARTICIPANT_MODE.ALL,
      };
      const pts = ptsValues || trainerTemplate || extractPtsValues(DEFAULT_CONFIG);
      POINTS_FIELD_KEYS.forEach((key) => {
        if (pts[key] !== undefined && pts[key] !== null) body[key] = pts[key];
      });
      body.anonymousRanking = !!pts.anonymousRanking;
      const response = await api.post('/trainer/challenges', body);
      showToast('Campeonato criado!', 'success');
      onCreated?.(response.data.id);
      onClose();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleEditScoring = () => {
    setShowPointsEditor(true);
  };

  const handleCreateWeekly = async (body) => {
    const response = await api.post('/trainer/challenges', body);
    onClose();
    showToast('Campeonato criado!', 'success');
    navigate(`/trainer/challenges/${response.data.id}`);
  };

  const handleCustomize = () => {
    onClose();
    navigate('/trainer/championships/create');
  };

  if (weeklyFormat) {
    return (
      <>
        <Modal title="Novo campeonato" onClose={handleRequestClose}>
          <WeeklyChampionshipForm onCreate={handleCreateWeekly} onCancel={handleRequestClose} onDirtyChange={setWeeklyDirty} />
        </Modal>
        {dialogProps && <ConfirmDialog {...dialogProps} />}
      </>
    );
  }

  return (
    <>
      <div className="overlay" onClick={handleRequestClose}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="bottom-sheet-header">
            <h2 className="bottom-sheet-title">Criar Campeonato</h2>
            <button
              type="button"
              className="bottom-sheet-close"
              onClick={handleRequestClose}
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
          <div className="bottom-sheet-body">
            <div className="championship-templates-list">
              {TEMPLATES.map((template) => {
                const isSelected = template.id === selectedTemplateId;
                return (
                  <div
                    key={template.id}
                    className={`championship-template-card${isSelected ? ' championship-template-card--selected' : ''}`}
                    onClick={() => handleSelectTemplate(template.id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isSelected}
                    aria-label={template.name}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectTemplate(template.id);
                      }
                    }}
                  >
                    <div className="championship-template-card__header">
                      <span className="championship-template-card__name">{template.name}</span>
                      {template.badge && (
                        <span className="badge badge-blue">{template.badge}</span>
                      )}
                    </div>

                    {isSelected ? (
                      <>
                        <p className="championship-template-card__description">
                          {template.description}
                        </p>
                        <ScoringCards ptsValues={currentPts} />
                        <div
                          className="form-group"
                          style={{ marginTop: 'var(--spacing-lg)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="form-label" htmlFor="championship-name">
                            Nome do campeonato
                          </label>
                          <input
                            id="championship-name"
                            type="text"
                            className={`form-input${nameError ? ' form-input--error' : ''}`}
                            value={championshipName}
                            onChange={(e) => {
                              setChampionshipName(e.target.value);
                              if (nameError) setNameError(null);
                            }}
                          />
                          {nameError && (
                            <span className="form-error">{nameError}</span>
                          )}
                        </div>
                        <div
                          className="championship-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleEditScoring}
                          >
                            Editar pontuações
                          </button>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={handleCreate}
                            disabled={creating || !championshipName.trim()}
                          >
                            {creating ? 'Criando...' : 'Criar campeonato'}
                          </button>
                        </div>
                        <p className="text-muted text-sm" style={{ marginTop: 'var(--spacing-sm)' }}>
                          Participantes podem ser adicionados depois
                        </p>
                      </>
                    ) : (
                      <CollapsedRules ptsValues={currentPts} />
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="btn-customize-scratch"
              onClick={handleCustomize}
            >
              <Plus size={16} />
              Personalizar do zero
            </button>
          </div>
        </div>
      </div>

      {showPointsEditor && (
        <PointsBottomSheet
          mode="editable"
          values={currentPts}
          template={trainerTemplate || extractPtsValues(DEFAULT_CONFIG)}
          onSave={(newValues) => {
            const { anonymousRanking, ...pts } = newValues;
            setPtsValues({ ...pts, anonymousRanking: !!anonymousRanking });
            setShowPointsEditor(false);
          }}
          onClose={() => setShowPointsEditor(false)}
        />
      )}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </>
  );
};

CreateChampionshipModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func,
};

export default CreateChampionshipModal;
