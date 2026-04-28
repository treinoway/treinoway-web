import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Calendar } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import RowMenu from '../../components/RowMenu';
import RankingList from '../../components/RankingList';
import StudentBonusSheet from '../../components/StudentBonusSheet';
import BonusChipGrid from '../../components/BonusChipGrid';
import DateInput from '../../components/DateInput';
import PointsSummaryCard from '../../components/PointsSummaryCard';
import PointsBottomSheet from '../../components/PointsBottomSheet';
import { formatDateForDisplay } from '../../utils/dateFormat';
import {
  CHALLENGE_STATUS,
  CHALLENGE_STATUS_LABEL,
  CHALLENGE_STATUS_BADGE,
  CHALLENGE_NAME_MAX_LENGTH,
} from '../../constants/challenge';
import { DEFAULT_CONFIG } from '../../constants/gamification';
import { POINTS_FIELD_KEYS } from '../../constants/points-fields';

const TABS = [
  { key: 'ranking', label: 'Ranking' },
  { key: 'participants', label: 'Participantes' },
  { key: 'config', label: 'Configurações' },
];

const getStudentFullName = (s) => {
  const full = `${s.firstName || ''} ${s.lastName || ''}`.trim();
  return full || s.email || 'Aluno';
};

const SkeletonRows = () => (
  <div>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="skeleton skeleton-text" style={{ marginBottom: 'var(--spacing-xs)' }} />
    ))}
  </div>
);

const extractPtsValues = (obj) => {
  const result = {};
  POINTS_FIELD_KEYS.forEach((key) => {
    result[key] = obj[key] ?? DEFAULT_CONFIG[key] ?? null;
  });
  return result;
};

const ChallengeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialTab = searchParams.get('tab') || 'ranking';
  const [tab, setTab] = useState(initialTab);

  // Ranking tab state
  const [ranking, setRanking] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [bonusStudent, setBonusStudent] = useState(null);
  const [bonusSubmitting, setBonusSubmitting] = useState(false);

  // Participants tab state
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSelected, setAddSelected] = useState([]);
  const [addingParticipants, setAddingParticipants] = useState(false);

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkSheet, setShowBulkSheet] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Config tab state
  const [editName, setEditName] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Points state
  const [trainerTemplate, setTrainerTemplate] = useState(null);
  const [showPointsSheet, setShowPointsSheet] = useState(false);
  const [pointsSaving, setPointsSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadChallenge = useCallback(async () => {
    try {
      const response = await api.get(`/trainer/challenges/${id}`);
      setChallenge(response.data);
      setEditName(response.data.name);
      setEditEndDate(response.data.endDate);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { loadChallenge(); }, [loadChallenge]);

  useEffect(() => {
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
    return () => { mounted = false; };
  }, []);

  const loadRanking = useCallback(async () => {
    setRankingLoading(true);
    try {
      const response = await api.get(`/trainer/challenges/${id}/ranking`);
      setRanking(response.data || []);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setRankingLoading(false);
    }
  }, [id, showToast]);

  const loadParticipants = useCallback(async () => {
    setParticipantsLoading(true);
    try {
      const response = await api.get(`/trainer/challenges/${id}/participants`);
      setParticipants(response.data || []);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setParticipantsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    if (tab === 'ranking') loadRanking();
    if (tab === 'participants') {
      loadParticipants();
      if (students.length === 0) {
        api.get('/trainer/students').then((r) => setStudents(r.data || [])).catch(() => {});
      }
    }
  }, [tab, loadRanking, loadParticipants, students.length]);

  const handleRankingRowTap = (entry) => {
    setBonusStudent(entry);
  };

  const handleAwardBonus = async (points, reason) => {
    if (!bonusStudent) return;
    setBonusSubmitting(true);
    try {
      const body = { points };
      if (reason) body.reason = reason;
      await api.post(`/trainer/challenges/${id}/students/${bonusStudent.studentId}/bonus`, body);
      setBonusStudent(null);
      setBonusSubmitting(false);
      showToast(`Bônus de +${points} pts enviado.`, 'success');
      await loadRanking();
    } catch (error) {
      setBonusSubmitting(false);
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const handleStartSelection = () => {
    setSelectionMode(true);
    setSelectedIds([]);
  };

  const handleExitSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleToggleParticipant = (studentId) => {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((x) => x !== studentId) : [...prev, studentId]
    );
  };

  const handleAwardBulkBonus = async (points, reason) => {
    if (selectedIds.length === 0) return;
    setBulkSubmitting(true);
    try {
      await Promise.all(
        selectedIds.map((studentId) => {
          const body = { points };
          if (reason) body.reason = reason;
          return api.post(`/trainer/challenges/${id}/students/${studentId}/bonus`, body);
        })
      );
      showToast(`Bônus de +${points} aplicado a ${selectedIds.length} aluno(s).`, 'success');
      setShowBulkSheet(false);
      handleExitSelection();
      await loadRanking();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleCancelChallenge = () => {
    setConfirmDialog({
      message: `Cancelar o campeonato "${challenge.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.post(`/trainer/challenges/${id}/cancel`);
          showToast('Campeonato cancelado.', 'success');
          navigate('/trainer/challenges');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleDeleteChallenge = () => {
    setConfirmDialog({
      message: `Excluir o campeonato "${challenge.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/challenges/${id}`);
          showToast('Campeonato excluído.', 'success');
          navigate('/trainer/challenges');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      if (editName !== challenge.name) payload.name = editName.trim();
      if (editEndDate !== challenge.endDate) payload.endDate = editEndDate;
      const response = await api.patch(`/trainer/challenges/${id}`, payload);
      setChallenge(response.data);
      showToast('Campeonato atualizado!', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePoints = async (newValues) => {
    setPointsSaving(true);
    try {
      const { anonymousRanking: anon, ...pts } = newValues;
      const payload = { ...pts, anonymousRanking: !!anon };
      const response = await api.patch(`/trainer/challenges/${id}`, payload);
      setChallenge(response.data);
      setShowPointsSheet(false);
      showToast('Pontuação atualizada!', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setPointsSaving(false);
    }
  };

  const handleRemoveParticipant = (participant) => {
    const name = getStudentFullName(participant);
    setConfirmDialog({
      message: `Remover ${name} do campeonato?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/challenges/${id}/participants/${participant.studentId}`);
          await Promise.all([loadParticipants(), loadChallenge()]);
          showToast('Participante removido.', 'success');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const toggleAddStudent = (studentId) => {
    setAddSelected((prev) =>
      prev.includes(studentId) ? prev.filter((x) => x !== studentId) : [...prev, studentId]
    );
  };

  const handleAddParticipants = async () => {
    if (addSelected.length === 0) return;
    setAddingParticipants(true);
    try {
      await api.post(`/trainer/challenges/${id}/participants`, { studentIds: addSelected });
      setAddSelected([]);
      setShowAddModal(false);
      await Promise.all([loadParticipants(), loadChallenge()]);
      showToast('Participantes adicionados.', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setAddingParticipants(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div>
        <p className="text-muted">Campeonato não encontrado.</p>
      </div>
    );
  }

  const participantIdSet = new Set(participants.map((p) => p.studentId));
  const selectableStudents = students.filter((s) => !participantIdSet.has(s.id));
  const canDelete = challenge.status === CHALLENGE_STATUS.SCHEDULED;
  const canCancel = challenge.status === CHALLENGE_STATUS.SCHEDULED || challenge.status === CHALLENGE_STATUS.ACTIVE;
  const canEditEndDate = challenge.status === CHALLENGE_STATUS.SCHEDULED || challenge.status === CHALLENGE_STATUS.ACTIVE;
  const canEditPoints = challenge.status === CHALLENGE_STATUS.SCHEDULED;
  const badgeClass = CHALLENGE_STATUS_BADGE[challenge.status] || 'badge-gray';

  const challengePtsValues = { ...extractPtsValues(challenge), anonymousRanking: !!challenge.anonymousRanking };
  const hasConfigChanges = editName !== challenge.name || editEndDate !== challenge.endDate;

  const getReadOnlyBanner = () => {
    if (challenge.status === CHALLENGE_STATUS.ACTIVE) {
      return 'Não é possível alterar as regras com o campeonato em andamento.';
    }
    if (challenge.status === CHALLENGE_STATUS.COMPLETED || challenge.status === CHALLENGE_STATUS.CANCELLED) {
      return 'Campeonato encerrado.';
    }
    return null;
  };

  return (
    <div>
      {selectionMode ? (
        <div className="bulk-bar" role="toolbar" aria-label="Seleção em massa">
          <button type="button" className="bulk-bar__btn" onClick={handleExitSelection}>Cancelar</button>
          <span className="bulk-bar__count">{selectedIds.length} selecionado(s)</span>
          <button
            type="button"
            className="bulk-bar__btn"
            onClick={() => setShowBulkSheet(true)}
            disabled={selectedIds.length === 0}
          >
            Dar bônus
          </button>
        </div>
      ) : (
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
      )}

      {!selectionMode && (
        <div className="card card--mb">
          <div className="card-header">
            <h1 className="card-title" style={{ marginBottom: 0 }}>{challenge.name}</h1>
            <span className={`badge ${badgeClass}`}>{CHALLENGE_STATUS_LABEL[challenge.status]}</span>
          </div>
          <div className="date-display text-sm text-muted">
            <Calendar size={14} strokeWidth={2} aria-hidden="true" />
            {formatDateForDisplay(challenge.startDate)}
            <span className="date-display__divider">—</span>
            {formatDateForDisplay(challenge.endDate)}
          </div>
          <p className="text-sm text-light">{challenge.participantCount} participantes</p>
        </div>
      )}

      <div className="segmented-toggle" style={{ marginBottom: 'var(--spacing-md)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`segmented-toggle-btn${tab === t.key ? ' segmented-toggle-btn--active' : ''}`}
            onClick={() => { if (selectionMode) handleExitSelection(); setTab(t.key); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ranking Tab */}
      {tab === 'ranking' && (
        rankingLoading
          ? <SkeletonRows />
          : <RankingList entries={ranking} onRowTap={handleRankingRowTap} />
      )}

      {/* Participants Tab */}
      {tab === 'participants' && (
        <>
          <div className="btn-group" style={{ marginBottom: 'var(--spacing-md)' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} strokeWidth={1.6} /> Adicionar
            </button>
            {!selectionMode && participants.length > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleStartSelection}
              >
                Selecionar
              </button>
            )}
          </div>

          {participantsLoading && <SkeletonRows />}

          {!participantsLoading && participants.length === 0 && (
            <div className="empty-state"><p className="empty-state-title">Nenhum participante.</p></div>
          )}

          {!participantsLoading && participants.length > 0 && (
            <ul className="participant-list">
              {participants.map((p) => {
                const isSelected = selectedIds.includes(p.studentId);
                return (
                  <li
                    key={p.id}
                    className={`participant-row${selectionMode ? ' participant-row--selectable' : ''}${isSelected ? ' participant-row--selected' : ''}`}
                    onClick={selectionMode ? () => handleToggleParticipant(p.studentId) : undefined}
                  >
                    {selectionMode && (
                      <span
                        className={`ranking-row__check${isSelected ? ' ranking-row__check--on' : ''}`}
                        aria-hidden="true"
                      >
                        {isSelected && <Check size={14} strokeWidth={2.5} />}
                      </span>
                    )}
                    <div style={{ flex: 1 }}>
                      <span>{getStudentFullName(p)}</span>
                      {p.points != null && (
                        <span className="text-sm text-muted" style={{ display: 'block' }}>{p.points} pts</span>
                      )}
                    </div>
                    {!selectionMode && (
                      <RowMenu
                        ariaLabel={`Ações para ${getStudentFullName(p)}`}
                        onDelete={() => handleRemoveParticipant(p)}
                        deleteLabel="Remover do campeonato"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <form onSubmit={handleSaveEdit} className="form">
          <div className="card card--mb">
            <div className="form-group">
              <label className="form-label" htmlFor="edit-name">Nome</label>
              <input
                id="edit-name"
                type="text"
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value.slice(0, CHALLENGE_NAME_MAX_LENGTH))}
                maxLength={CHALLENGE_NAME_MAX_LENGTH}
                disabled={saving}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-startDate">Data de início</label>
              <input
                id="edit-startDate"
                type="text"
                className="form-input"
                value={formatDateForDisplay(challenge.startDate)}
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-endDate">Data de término</label>
              <DateInput
                id="edit-endDate"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="form-input"
                disabled={saving || !canEditEndDate}
              />
              {!canEditEndDate && (
                <span className="text-sm text-muted">Campeonato encerrado. Não é possível editar.</span>
              )}
            </div>
          </div>

          <PointsSummaryCard
            values={challengePtsValues}
            showDiff={false}
            editable={canEditPoints}
            onAction={() => setShowPointsSheet(true)}
          />

          <div className="btn-group mt-lg">
            <button type="submit" className="btn-primary" disabled={saving || !canEditEndDate || !hasConfigChanges}>
              {saving ? 'Salvando...' : 'Salvar configuração'}
            </button>
          </div>

          {(canCancel || canDelete) && (
            <>
              <hr className="separator" />
              <div>
                <h3 className="text-sm font-medium danger-zone-title">Zona de perigo</h3>
                <div className="btn-group">
                  {canCancel && (
                    <button type="button" className="btn-danger" onClick={handleCancelChallenge}>
                      Cancelar campeonato
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" className="btn-danger" onClick={handleDeleteChallenge}>
                      Excluir campeonato
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </form>
      )}

      {/* Points BottomSheet */}
      {showPointsSheet && (
        <PointsBottomSheet
          mode={canEditPoints ? 'editable' : 'readOnly'}
          values={challengePtsValues}
          template={trainerTemplate}
          onSave={handleSavePoints}
          onClose={() => setShowPointsSheet(false)}
          saving={pointsSaving}
          bannerText={!canEditPoints ? getReadOnlyBanner() : undefined}
        />
      )}

      {/* StudentBonusSheet */}
      {bonusStudent && (
        <StudentBonusSheet
          student={bonusStudent}
          onAward={handleAwardBonus}
          onClose={() => setBonusStudent(null)}
          disabled={bonusSubmitting}
        />
      )}

      {/* Bulk Bonus Sheet */}
      {showBulkSheet && (
        <div className="overlay">
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3 className="bottom-sheet-title">
                Dar bônus para {selectedIds.length} aluno(s)
              </h3>
              <button
                type="button"
                className="bottom-sheet-close"
                onClick={() => !bulkSubmitting && setShowBulkSheet(false)}
                aria-label="Fechar"
              >&times;</button>
            </div>
            <div className="bottom-sheet-body">
              <BonusChipGrid onAward={handleAwardBulkBonus} disabled={bulkSubmitting} />
            </div>
          </div>
        </div>
      )}

      {/* Add participants modal */}
      {showAddModal && (
        <div className="overlay">
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3 className="bottom-sheet-title">Adicionar participantes</h3>
              <button
                type="button"
                className="bottom-sheet-close"
                onClick={() => setShowAddModal(false)}
                aria-label="Fechar"
              >&times;</button>
            </div>
            <div className="bottom-sheet-body">
              {selectableStudents.length === 0 ? (
                <p className="text-muted">Todos os seus alunos já estão neste campeonato.</p>
              ) : (
                <div className="checkbox-list">
                  {selectableStudents.map((s) => (
                    <label key={s.id} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={addSelected.includes(s.id)}
                        onChange={() => toggleAddStudent(s.id)}
                        disabled={addingParticipants}
                      />
                      {' '}{`${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email}
                    </label>
                  ))}
                </div>
              )}
              <div className="btn-group" style={{ marginTop: 'var(--spacing-md)' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAddParticipants}
                  disabled={addingParticipants || addSelected.length === 0}
                >
                  {addingParticipants ? 'Adicionando...' : 'Adicionar'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={addingParticipants}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="overlay">
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button type="button" onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>Confirmar</button>
              <button type="button" onClick={() => setConfirmDialog(null)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengeDetail;
