import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ArrowLeft, Calendar, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';
import RowMenu from '../../components/RowMenu';
import { ANAMNESIS_FILL_TOAST_DURATION_MS, getAnamnesisFillPath } from '../../constants/anamnesis';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { canFillLink, canViewLinkResponses, getLinkStatusInfo } from '../../utils/anamnesisLinkStatus';

const getResponsePath = (studentId, anamnesisId) => `/trainer/students/${studentId}/anamneses/${anamnesisId}/response`;

/** Card keyboard activation; ignores keys coming from the row menu inside it. */
const handleCardKeyDown = (event, onActivate) => {
  if (event.target !== event.currentTarget) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onActivate();
};

/**
 * Same shape as the StudentProtocols cards. The whole card opens the responses
 * only when they can be viewed; filling stays a menu action because it needs
 * the trainer to confirm the student is present.
 */
const LinkedAnamnesisCard = ({ link, linkedAt, menuItems, onOpenResponses, onUnlink }) => {
  const status = getLinkStatusInfo(link);
  const { title, isGeneral } = link.anamnesis;
  const isClickable = canViewLinkResponses(link);
  const interactiveProps = isClickable
    ? {
        className: 'card-link',
        role: 'link',
        tabIndex: 0,
        'aria-label': `Ver respostas da anamnese ${title}`,
        onClick: onOpenResponses,
        onKeyDown: (event) => handleCardKeyDown(event, onOpenResponses),
      }
    : { className: 'card' };

  return (
    <div {...interactiveProps}>
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-title">{title}</span>
          {isGeneral && <span className="badge badge-blue">Geral</span>}
        </div>
        <div className="card-header-actions">
          <span className={`badge ${status.badgeClass}`}>{status.label}</span>
          <RowMenu
            ariaLabel={`Opções da anamnese ${title}`}
            extraItems={menuItems}
            onDelete={onUnlink}
            deleteLabel="Desvincular"
          />
        </div>
      </div>
      <div className="stack-sm">
        {status.detail && <p className="text-sm text-muted">{status.detail}</p>}
        {linkedAt && (
          <p className="date-display text-sm text-muted">
            <Calendar size={14} strokeWidth={2} aria-hidden="true" />
            Vinculada em {linkedAt}
          </p>
        )}
      </div>
    </div>
  );
};

LinkedAnamnesisCard.propTypes = {
  link: PropTypes.shape({
    anamnesis: PropTypes.shape({ title: PropTypes.string, isGeneral: PropTypes.bool }).isRequired,
  }).isRequired,
  linkedAt: PropTypes.string,
  menuItems: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, onClick: PropTypes.func })).isRequired,
  onOpenResponses: PropTypes.func.isRequired,
  onUnlink: PropTypes.func.isRequired,
};

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
      showToast('Anamnese vinculada com sucesso!', 'success', {
        actionLabel: 'Preencher agora',
        onAction: () => navigate(getAnamnesisFillPath(id, selectedAnamnesisId)),
        duration: ANAMNESIS_FILL_TOAST_DURATION_MS,
      });
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

  const buildMenuItems = (link) => [
    ...(canFillLink(link)
      ? [{ label: 'Preencher com o aluno', onClick: () => navigate(getAnamnesisFillPath(id, link.anamnesis.id)) }]
      : []),
    ...(canViewLinkResponses(link)
      ? [{
          label: 'Ver respostas',
          onClick: () => navigate(getResponsePath(id, link.anamnesis.id)),
        }]
      : []),
    { label: 'Abrir template', onClick: () => navigate(`/trainer/anamneses/${link.anamnesis.id}`) },
  ];

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
        <div className="stack-md">
          {linkedAnamneses.map((link) => (
            <LinkedAnamnesisCard
              key={link.id}
              link={link}
              linkedAt={formatLinkedAt(link)}
              menuItems={buildMenuItems(link)}
              onOpenResponses={() => navigate(getResponsePath(id, link.anamnesis.id))}
              onUnlink={() => handleUnlink(link)}
            />
          ))}
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
