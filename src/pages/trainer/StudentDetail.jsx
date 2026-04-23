import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { getStatusLabel, getStatusBadgeClass } from '../../constants/protocolStatus';
import RowMenu from '../../components/RowMenu';

const getAvatarInitial = (student) => {
  if (student?.firstName) return student.firstName.charAt(0).toUpperCase();
  if (student?.email) return student.email.charAt(0).toUpperCase();
  return '?';
};

const getStudentName = (student) => {
  if (!student) return null;
  if (student.firstName || student.lastName) {
    return [student.firstName, student.lastName].filter(Boolean).join(' ');
  }
  return null;
};

const ProtocolsTab = ({ studentId }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [protocols, setProtocols] = useState([]);
  const [protocolsLoading, setProtocolsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchProtocols = useCallback(async () => {
    setProtocolsLoading(true);
    try {
      const r = await api.get('/trainer/protocols', { params: { assigneeId: studentId } });
      setProtocols(r.data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setProtocolsLoading(false);
    }
  }, [studentId, showToast]);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  const handleDeleteProtocol = (protocol) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir esta rotina? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await api.delete(`/trainer/protocols/${protocol.id}`);
          showToast('Rotina excluída', 'success');
          fetchProtocols();
        } catch (err) {
          showToast(err.userMessage || translateError(err), 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  if (protocolsLoading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando rotinas...</span>
      </div>
    );
  }

  if (protocols.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Nenhuma rotina encontrada</p>
        <Link
          to={`/trainer/protocols/new?studentId=${studentId}`}
          className="btn-primary"
          style={{ marginTop: 'var(--spacing-md)' }}
        >
          Criar Rotina
        </Link>
      </div>
    );
  }

  return (
    <div className="stack-md">
      {protocols.map((protocol) => {
        const openProtocol = () => navigate(`/trainer/protocols/${protocol.id}`);
        const handleKeyDown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProtocol();
          }
        };
        return (
          <div
            key={protocol.id}
            className="card-link"
            role="link"
            tabIndex={0}
            onClick={openProtocol}
            onKeyDown={handleKeyDown}
          >
            <div className="card-header">
              <span className="card-title" style={{ marginBottom: 0 }}>{protocol.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <span className={getStatusBadgeClass(protocol.status)}>
                  {getStatusLabel(protocol.status)}
                </span>
                <RowMenu
                  ariaLabel={`Ações da rotina ${protocol.name}`}
                  extraItems={[{ label: 'Abrir', onClick: openProtocol }]}
                  onDelete={() => handleDeleteProtocol(protocol)}
                  deleteDisabled={protocol.status === 'active'}
                  deleteDisabledTitle="Arquive a rotina antes de excluir"
                />
              </div>
            </div>
            <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
              {formatDateForDisplay(protocol.startDate)}
              {' – '}
              {formatDateForDisplay(protocol.expirationDate)}
            </p>
          </div>
        );
      })}

      {confirmDialog && (
        <div className="overlay">
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>
                Confirmar
              </button>
              <button onClick={() => setConfirmDialog(null)} className="btn-secondary" style={{ flex: 1 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AnamnesisTab = ({ studentId }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [linkedAnamneses, setLinkedAnamneses] = useState([]);
  const [allAnamneses, setAllAnamneses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [selectedAnamnesisId, setSelectedAnamnesisId] = useState('');
  const [linking, setLinking] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchLinkedAnamneses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/trainer/students/${studentId}/anamneses`);
      setLinkedAnamneses(response.data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [studentId, showToast]);

  const fetchAllAnamneses = useCallback(async () => {
    try {
      const response = await api.get('/trainer/anamneses');
      setAllAnamneses(response.data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    }
  }, [showToast]);

  useEffect(() => {
    fetchLinkedAnamneses();
  }, [fetchLinkedAnamneses]);

  const handleOpenLinkForm = () => {
    fetchAllAnamneses();
    setShowLinkForm(true);
  };

  const handleLink = async (e) => {
    e.preventDefault();
    if (!selectedAnamnesisId) return;
    setLinking(true);
    try {
      await api.post(`/trainer/students/${studentId}/anamneses`, { anamnesisId: selectedAnamnesisId });
      showToast('Anamnese vinculada com sucesso!', 'success');
      setShowLinkForm(false);
      setSelectedAnamnesisId('');
      fetchLinkedAnamneses();
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = (link) => {
    setConfirmDialog({
      message: `Desvincular a anamnese "${link.anamnesis.title}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/students/${studentId}/anamneses/${link.anamnesis.id}`);
          showToast('Anamnese desvinculada com sucesso!', 'success');
          fetchLinkedAnamneses();
        } catch (err) {
          showToast(err.userMessage || translateError(err), 'error');
        }
      },
    });
  };

  const formatLinkedAt = (link) => {
    const raw = link.createdAt ?? link.linkedAt ?? null;
    if (!raw) return null;
    return formatDateForDisplay(raw);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando anamneses...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <span />
        <button type="button" onClick={handleOpenLinkForm} className="btn-primary">
          + Vincular Anamnese
        </button>
      </div>

      {linkedAnamneses.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhuma anamnese vinculada</p>
          <p>Vincule uma anamnese para que o aluno possa respondê-la</p>
        </div>
      )}

      {linkedAnamneses.length > 0 && (
        <div>
          {linkedAnamneses.map((link) => {
            const linkedAt = formatLinkedAt(link);
            return (
              <div key={link.id} className="anamnesis-link-card">
                <div className="anamnesis-link-card-header">
                  <div>
                    <span className="anamnesis-link-card-title">{link.anamnesis.title}</span>
                    {link.anamnesis.isGeneral && (
                      <span className="badge badge-blue" style={{ marginLeft: 'var(--spacing-xs)' }}>
                        Geral
                      </span>
                    )}
                  </div>
                </div>
                {linkedAt && (
                  <p className="anamnesis-link-card-meta">Vinculada em {linkedAt}</p>
                )}
                <div className="anamnesis-link-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      navigate(
                        `/trainer/students/${studentId}/anamneses/${link.anamnesis.id}/response`,
                      )
                    }
                  >
                    Ver respostas
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate(`/trainer/anamneses/${link.anamnesis.id}`)}
                  >
                    Abrir template
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--md-error)' }}
                    onClick={() => handleUnlink(link)}
                  >
                    Desvincular
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showLinkForm && (
        <div className="overlay">
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Vincular Anamnese</h2>
              <button
                type="button"
                onClick={() => setShowLinkForm(false)}
                className="bottom-sheet-close"
                aria-label="Fechar"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="bottom-sheet-body">
              <form onSubmit={handleLink} className="form">
                <div>
                  <label className="form-label" htmlFor="anamnesis-select">Selecionar anamnese</label>
                  <Select
                    id="anamnesis-select"
                    value={selectedAnamnesisId}
                    onChange={(e) => setSelectedAnamnesisId(e.target.value)}
                    required
                    disabled={linking}
                  >
                    <option value="">Selecione uma anamnese...</option>
                    {allAnamneses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}{a.isGeneral ? ' (Geral)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="btn-group">
                  <button
                    type="submit"
                    disabled={linking || !selectedAnamnesisId}
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    {linking ? 'Vinculando...' : 'Vincular'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLinkForm(false)}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="overlay">
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>
                Desvincular
              </button>
              <button onClick={() => setConfirmDialog(null)} className="btn-secondary" style={{ flex: 1 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TABS = [
  { key: 'protocols', label: 'Rotinas' },
  { key: 'anamneses', label: 'Anamneses' },
];

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const stateStudent = location.state?.student ?? null;
  const [student, setStudent] = useState(stateStudent);
  const [loading, setLoading] = useState(!stateStudent);
  const [activeTab, setActiveTab] = useState('protocols');

  useEffect(() => {
    if (stateStudent) return;
    api.get('/trainer/students')
      .then((r) => setStudent(r.data.find((s) => String(s.id) === String(id)) ?? null))
      .catch((err) => showToast(err.userMessage || translateError(err), 'error'))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <button
          onClick={() => navigate('/trainer/students')}
          className="btn-back"
          aria-label="Voltar para alunos"
        >
          <ArrowLeft size={16} strokeWidth={1.6} />
          Alunos
        </button>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="student-card-info" style={{ marginBottom: 0 }}>
          <div className="student-avatar">{getAvatarInitial(student)}</div>
          <div className="student-card-details">
            <span className="student-card-name">
              {getStudentName(student) ?? student?.email ?? '—'}
            </span>
            {student?.email && getStudentName(student) && (
              <span className="student-card-email">{student.email}</span>
            )}
          </div>
        </div>
      </div>

      <div className="segmented-toggle" style={{ marginBottom: 'var(--spacing-md)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`segmented-toggle-btn${activeTab === tab.key ? ' segmented-toggle-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          {TABS.find((t) => t.key === activeTab)?.label}
        </h2>
        {activeTab === 'protocols' && (
          <Link to={`/trainer/protocols/new?studentId=${id}`} className="btn-primary">
            + Criar Rotina
          </Link>
        )}
      </div>

      {activeTab === 'protocols' && <ProtocolsTab studentId={id} />}
      {activeTab === 'anamneses' && <AnamnesisTab studentId={id} />}
    </div>
  );
};

export default StudentDetail;
