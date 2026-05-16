import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';
import { formatDateForDisplay } from '../../utils/dateFormat';

const StudentAnamneses = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [linkedAnamneses, setLinkedAnamneses] = useState([]);
  const [allAnamneses, setAllAnamneses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [selectedAnamnesisId, setSelectedAnamnesisId] = useState('');
  const [linking, setLinking] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchLinkedAnamneses = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/trainer/students/${id}/anamneses`);
      setLinkedAnamneses(r.data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchLinkedAnamneses();
    api.get('/trainer/students')
      .then((r) => {
        const s = r.data.find((st) => String(st.id) === String(id));
        if (s) {
          const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
          setStudentName(name);
        }
      })
      .catch(() => {});
  }, [fetchLinkedAnamneses, id]);

  const handleOpenLinkForm = () => {
    api.get('/trainer/anamneses')
      .then((r) => setAllAnamneses(r.data))
      .catch((err) => showToast(err.userMessage || translateError(err), 'error'));
    setShowLinkForm(true);
  };

  const handleLink = async (e) => {
    e.preventDefault();
    if (!selectedAnamnesisId) return;
    setLinking(true);
    try {
      await api.post(`/trainer/students/${id}/anamneses`, { anamnesisId: selectedAnamnesisId });
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
          await api.delete(`/trainer/students/${id}/anamneses/${link.anamnesis.id}`);
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
      <div className="page-header">
        <div className="page-header-title-row">
          <button
            type="button"
            className="btn-back"
            onClick={() => navigate(`/trainer/students/${id}`)}
            aria-label="Voltar para o aluno"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {studentName ?? 'Aluno'}
          </button>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenLinkForm}
          >
            + Vincular Anamnese
          </button>
        </div>
      </div>

      {linkedAnamneses.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhuma anamnese vinculada</p>
          <p className="empty-state-description">
            Vincule uma anamnese para que o aluno possa respondê-la.
          </p>
        </div>
      ) : (
        <div>
          {linkedAnamneses.map((link) => {
            const linkedAt = formatLinkedAt(link);
            return (
              <div key={link.id} className="anamnesis-link-card">
                <div className="anamnesis-link-card-header">
                  <div>
                    <span className="anamnesis-link-card-title">
                      {link.anamnesis.title}
                    </span>
                    {link.anamnesis.isGeneral && (
                      <span className="badge badge-blue">Geral</span>
                    )}
                  </div>
                </div>
                {linkedAt && (
                  <p className="anamnesis-link-card-meta">Vinculada em {linkedAt}</p>
                )}
                <div className="anamnesis-link-card-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() =>
                      navigate(
                        `/trainer/students/${id}/anamneses/${link.anamnesis.id}/response`,
                      )
                    }
                  >
                    Ver respostas
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => navigate(`/trainer/anamneses/${link.anamnesis.id}`)}
                  >
                    Abrir template
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
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
        <div className="overlay" onClick={() => setShowLinkForm(false)}>
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
                <div className="form-group">
                  <label className="form-label" htmlFor="anamnesis-select">
                    Selecionar anamnese
                  </label>
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
                <div className="btn-group btn-group--equal">
                  <button
                    type="submit"
                    disabled={linking || !selectedAnamnesisId}
                    className="btn-primary"
                  >
                    {linking ? 'Vinculando...' : 'Vincular'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLinkForm(false)}
                    className="btn-secondary"
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
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group btn-group--equal">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
              >
                Desvincular
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
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

export default StudentAnamneses;
