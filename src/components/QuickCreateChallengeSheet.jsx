import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';
import PointsBottomSheet from './PointsBottomSheet';
import { CHALLENGE_PRESETS, PARTICIPANT_MODE, CHALLENGE_NAME_MAX_LENGTH } from '../constants/challenge';
import { DEFAULT_CONFIG } from '../constants/gamification';
import { POINTS_FIELD_KEYS } from '../constants/points-fields';

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
  const [expandedKey, setExpandedKey] = useState(null);
  const [presetNames, setPresetNames] = useState({});
  const [nameErrors, setNameErrors] = useState({});
  const [activeCount, setActiveCount] = useState(null);
  const [creatingKey, setCreatingKey] = useState(null);
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
      .catch(() => { if (mounted) setTrainerTemplate({ ...extractPtsValues(DEFAULT_CONFIG), anonymousRanking: false }); });
    return () => { mounted = false; };
  }, []);

  const handleTogglePreset = (key, defaultName) => {
    setExpandedKey((prev) => {
      const next = prev === key ? null : key;
      if (next) {
        setPresetNames((names) => ({ ...names, [key]: names[key] ?? defaultName }));
      }
      return next;
    });
  };

  const handleCreate = async (preset) => {
    const name = (presetNames[preset.key] ?? preset.defaultName).trim();
    if (!name) {
      setNameErrors((prev) => ({ ...prev, [preset.key]: 'Nome é obrigatório.' }));
      return;
    }
    setCreatingKey(preset.key);
    try {
      const start = todayIso();
      const end = addDays(start, preset.durationDays);
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
      setCreatingKey(null);
    }
  };

  const handleCustomize = () => {
    onClose();
    navigate('/trainer/challenges/new');
  };

  const handleOpenEditor = (e) => {
    e.stopPropagation();
    setShowPointsEditor(true);
  };

  const handlePointsSave = (newValues) => {
    const { anonymousRanking, ...pts } = newValues;
    setPtsValues({ ...pts, anonymousRanking: !!anonymousRanking });
    setShowPointsEditor(false);
  };

  const previewValues = trainerTemplate || extractPtsValues(DEFAULT_CONFIG);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="bottom-sheet bottom-sheet--large" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h3 className="bottom-sheet-title">Criar campeonato</h3>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Fechar"
          >x</button>
        </div>
        <div className="bottom-sheet-body">
          {CHALLENGE_PRESETS.map((preset) => {
            const isOpen = expandedKey === preset.key;
            return (
              <div
                key={preset.key}
                className={`preset-card${isOpen ? ' preset-card--open' : ''}`}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => handleTogglePreset(preset.key, preset.defaultName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTogglePreset(preset.key, preset.defaultName);
                  }
                }}
              >
                <h4 className="preset-card__title">{preset.title}</h4>
                <p className="preset-card__desc">{preset.description}</p>
                {isOpen && (
                  <div className="preset-card__details">
                    <div className="form-group mb-sm">
                      <label className="form-label" htmlFor={`preset-name-${preset.key}`}>Nome</label>
                      <input
                        id={`preset-name-${preset.key}`}
                        className={`form-input${nameErrors[preset.key] ? ' form-input--error' : ''}`}
                        type="text"
                        value={presetNames[preset.key] ?? preset.defaultName}
                        maxLength={CHALLENGE_NAME_MAX_LENGTH}
                        onChange={(e) => {
                          setPresetNames((prev) => ({ ...prev, [preset.key]: e.target.value }));
                          if (nameErrors[preset.key]) setNameErrors((prev) => ({ ...prev, [preset.key]: null }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                      {nameErrors[preset.key] && <span className="form-error">{nameErrors[preset.key]}</span>}
                    </div>
                    <p className="text-sm text-muted mb-sm">
                      {activeCount !== null
                        ? activeCount > 0
                          ? `${activeCount} aluno(s) ativo(s) participarão.`
                          : 'Nenhum aluno ativo. Você pode adicionar participantes depois.'
                        : 'Calculando participantes...'}
                    </p>
                    <p className="text-sm text-muted mb-sm">
                      Pontuação: {ptsValues ? 'personalizada' : 'preferências padrão'}{' '}
                      <button
                        type="button"
                        className="btn-link"
                        onClick={handleOpenEditor}
                        aria-label="Editar regras de pontuação"
                      >
                        Editar
                      </button>
                    </p>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={(e) => { e.stopPropagation(); handleCreate(preset); }}
                      disabled={creatingKey !== null}
                      style={{ width: '100%' }}
                    >
                      {creatingKey === preset.key ? 'Criando...' : 'Criar'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            className="btn-secondary"
            onClick={handleCustomize}
            style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
          >
            Personalizar do zero
          </button>
        </div>
      </div>

      {showPointsEditor && (
        <PointsBottomSheet
          mode="editable"
          values={ptsValues || previewValues}
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
