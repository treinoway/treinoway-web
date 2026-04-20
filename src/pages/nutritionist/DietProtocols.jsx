import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ClipboardList, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RowMenu from '../../components/RowMenu';
import Select from '../../components/Select';
import api from '../../api/axios';
import { translateError } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import {
  DIET_PROTOCOL_STATUS,
  DIET_PROTOCOL_STATUS_BADGE_CLASS,
  DIET_PROTOCOL_STATUS_LABEL,
  DIET_TYPE_LABEL,
  GOAL_TYPE_LABEL,
} from '../../constants/diet';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
};

/* ─── CreateProtocolSheet ────────────────────────────────────────────────── */

const CreateProtocolSheet = ({ onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState('blank'); // 'blank' | 'template'
  const [patients, setPatients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    assigneeId: '',
    templateId: '',
    name: '',
    startDate: today,
    expirationDate: '',
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const [pRes, tRes] = await Promise.all([
          api.get('/nutritionist/patients'),
          api.get('/nutritionist/diet-protocol-templates'),
        ]);
        setPatients((pRes.data || []).map((link) => ({ ...link, ...(link.patient ?? {}) })));
        setTemplates(tRes.data || []);
      } catch (error) {
        showToast(error.userMessage || translateError(error), 'error');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [showToast]);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let res;
      if (origin === 'template' && form.templateId) {
        res = await api.post('/nutritionist/diet-protocols/import-from-template', {
          templateId: form.templateId,
          assigneeId: form.assigneeId,
          startDate: form.startDate,
          ...(form.expirationDate && { expirationDate: form.expirationDate }),
          ...(form.name && { name: form.name }),
        });
      } else {
        const selectedPatient = patients.find((p) => String(p.id) === String(form.assigneeId));
        const patientName = selectedPatient
          ? [selectedPatient.firstName, selectedPatient.lastName].filter(Boolean).join(' ')
          : 'Paciente';

        res = await api.post('/nutritionist/diet-protocols', {
          assigneeId: form.assigneeId,
          name: form.name || `Dieta de ${patientName}`,
          startDate: form.startDate,
          status: DIET_PROTOCOL_STATUS.DRAFT,
          ...(form.expirationDate && { expirationDate: form.expirationDate }),
        });
      }
      onSuccess(res.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-protocol-title"
      >
        <div className="bottom-sheet-header">
          <h2 id="create-protocol-title" className="bottom-sheet-title">Criar protocolo</h2>
          <button type="button" className="bottom-sheet-close" aria-label="Fechar" onClick={onClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="bottom-sheet-body">
          {loadingData ? (
            <div className="loading-screen" style={{ minHeight: 120 }}>
              <span className="loading-text">Carregando...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="form">
              {/* Patient */}
              <div className="form-group">
                <label className="form-label" htmlFor="protocol-patient">Paciente</label>
                <Select
                  id="protocol-patient"
                  value={form.assigneeId}
                  onChange={handleChange('assigneeId')}
                  required
                  disabled={saving}
                >
                  <option value="">Selecione um paciente…</option>
                  {patients.map((p) => {
                    const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email;
                    return <option key={p.id} value={p.id}>{name}</option>;
                  })}
                </Select>
              </div>

              {/* Origin segmented toggle */}
              <div className="form-group">
                <label className="form-label">Origem</label>
                <div className="segmented-toggle" role="group" aria-label="Origem do protocolo">
                  <button
                    type="button"
                    className={`segmented-toggle-btn${origin === 'blank' ? ' segmented-toggle-btn--active' : ''}`}
                    onClick={() => setOrigin('blank')}
                    aria-pressed={origin === 'blank'}
                  >
                    Em branco
                  </button>
                  <button
                    type="button"
                    className={`segmented-toggle-btn${origin === 'template' ? ' segmented-toggle-btn--active' : ''}`}
                    onClick={() => setOrigin('template')}
                    aria-pressed={origin === 'template'}
                    disabled={templates.length === 0}
                  >
                    A partir de modelo
                  </button>
                </div>
              </div>

              {/* Template select — only shown when origin = template */}
              {origin === 'template' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="protocol-template">Modelo</label>
                  <Select
                    id="protocol-template"
                    value={form.templateId}
                    onChange={handleChange('templateId')}
                    required={origin === 'template'}
                    disabled={saving}
                  >
                    <option value="">Selecione um modelo…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Protocol name */}
              <div className="form-group">
                <label className="form-label" htmlFor="protocol-name">
                  Nome do protocolo <span className="form-hint" style={{ display: 'inline' }}>(opcional)</span>
                </label>
                <input
                  id="protocol-name"
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={handleChange('name')}
                  disabled={saving}
                  placeholder="Ex: Dieta de hipertrofia"
                />
              </div>

              {/* Date range */}
              <div className="grid-responsive-2col">
                <div className="form-group">
                  <label className="form-label" htmlFor="protocol-start">Data de início</label>
                  <input
                    id="protocol-start"
                    type="date"
                    className="form-input"
                    value={form.startDate}
                    onChange={handleChange('startDate')}
                    required
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="protocol-end">
                    Data de término <span className="form-hint" style={{ display: 'inline' }}>(opcional)</span>
                  </label>
                  <input
                    id="protocol-end"
                    type="date"
                    className="form-input"
                    value={form.expirationDate}
                    onChange={handleChange('expirationDate')}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="btn-group" style={{ marginTop: 'var(--spacing-lg)' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={saving || !form.assigneeId || !form.startDate}
                >
                  {saving ? 'Criando…' : 'Criar como rascunho'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

CreateProtocolSheet.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

/* ─── DietProtocols ──────────────────────────────────────────────────────── */

const DietProtocols = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/nutritionist/diet-protocols');
      setProtocols(res.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  const handleCreateSuccess = (protocol) => {
    setShowCreateSheet(false);
    showToast('Protocolo criado como rascunho', 'success');
    navigate(`/nutritionist/diet-protocols/${protocol.id}/edit`);
  };

  const handleDelete = (protocol) => {
    setConfirmDialog({
      message: `Excluir o protocolo "${protocol.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/nutritionist/diet-protocols/${protocol.id}`);
          setProtocols((prev) => prev.filter((p) => p.id !== protocol.id));
          showToast('Protocolo excluído', 'success');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title-row">
          <ClipboardList size={24} className="page-header-title-icon" />
          <h1>Protocolos de Dieta</h1>
        </div>
        <div className="page-header-actions">
          {protocols.length > 0 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setShowCreateSheet(true)}
            >
              + Novo protocolo
            </button>
          )}
        </div>
      </div>

      {protocols.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <ClipboardList size={32} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">Nenhum protocolo ainda</p>
          <p>Crie protocolos de dieta para seus pacientes.</p>
          <button
            className="btn-primary"
            onClick={() => setShowCreateSheet(true)}
          >
            + Criar primeiro protocolo
          </button>
        </div>
      ) : (
        <div className="grid-cards">
          {protocols.map((protocol) => {
            const patientName = [
              protocol.assignee?.firstName,
              protocol.assignee?.lastName,
            ].filter(Boolean).join(' ') || protocol.assignee?.email || '—';
            const statusBadgeClass = DIET_PROTOCOL_STATUS_BADGE_CLASS[protocol.status] || 'badge badge-gray';
            const statusLabel = DIET_PROTOCOL_STATUS_LABEL[protocol.status] || protocol.status;
            const dietLabel = DIET_TYPE_LABEL[protocol.dietType];
            const goalLabel = GOAL_TYPE_LABEL[protocol.goalType];

            return (
              <div
                key={protocol.id}
                className="card card-link"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/nutritionist/diet-protocols/${protocol.id}/edit`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/nutritionist/diet-protocols/${protocol.id}/edit`);
                  }
                }}
                aria-label={`Ver protocolo ${protocol.name || patientName}`}
              >
                <div className="card-header-row">
                  <div>
                    <h3 className="card-subtitle">{protocol.name || `Dieta de ${patientName}`}</h3>
                    <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)', marginTop: 'var(--spacing-2xs)' }}>
                      {patientName}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <span className={statusBadgeClass}>{statusLabel}</span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        ariaLabel={`Ações do protocolo ${protocol.name || patientName}`}
                        onDelete={() => handleDelete(protocol)}
                        deleteLabel="Excluir"
                      />
                    </div>
                  </div>
                </div>
                {(dietLabel || goalLabel) && (
                  <div className="card-badges">
                    {dietLabel && <span className="badge badge-blue">{dietLabel}</span>}
                    {goalLabel && <span className="badge badge-gray">{goalLabel}</span>}
                  </div>
                )}
                <div className="text-sm" style={{ color: 'var(--color-on-surface-variant)', marginTop: 'var(--spacing-xs)' }}>
                  {formatDate(protocol.startDate)}
                  {protocol.expirationDate && ` → ${formatDate(protocol.expirationDate)}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateSheet && (
        <CreateProtocolSheet
          onClose={() => setShowCreateSheet(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DietProtocols;
