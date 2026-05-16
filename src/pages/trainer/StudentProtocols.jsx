import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import RowMenu from '../../components/RowMenu';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { getStatusLabel, getStatusBadgeClass } from '../../constants/protocolStatus';

const StudentProtocols = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchProtocols = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/trainer/protocols', { params: { assigneeId: id } });
      setProtocols(r.data);
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchProtocols();
    api.get('/trainer/students')
      .then((r) => {
        const s = r.data.find((st) => String(st.id) === String(id));
        if (s) {
          const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
          setStudentName(name);
        }
      })
      .catch(() => {});
  }, [fetchProtocols, id]);

  const handleDelete = (protocol) => {
    setConfirmDialog({
      message: `Excluir rotina "${protocol.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/protocols/${protocol.id}`);
          showToast('Rotina excluída', 'success');
          fetchProtocols();
        } catch (err) {
          showToast(err.userMessage || translateError(err), 'error');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando rotinas...</span>
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
          <Link
            to={`/trainer/protocols/new?studentId=${id}`}
            className="btn-primary"
          >
            + Criar Rotina
          </Link>
        </div>
      </div>

      {protocols.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhuma rotina encontrada</p>
          <p className="empty-state-description">
            Crie a primeira rotina para este aluno.
          </p>
          <Link
            to={`/trainer/protocols/new?studentId=${id}`}
            className="btn-primary"
          >
            Criar Rotina
          </Link>
        </div>
      ) : (
        <div className="stack-md">
          {protocols.map((protocol) => {
            const openProtocol = () => navigate(`/trainer/protocols/${protocol.id}`);
            return (
              <div
                key={protocol.id}
                className="card-link"
                role="link"
                tabIndex={0}
                onClick={openProtocol}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openProtocol();
                  }
                }}
              >
                <div className="card-header">
                  <span className="card-title">{protocol.name}</span>
                  <div className="card-header-actions">
                    <span className={getStatusBadgeClass(protocol.status)}>
                      {getStatusLabel(protocol.status)}
                    </span>
                    <RowMenu
                      ariaLabel={`Ações da rotina ${protocol.name}`}
                      extraItems={[{ label: 'Abrir', onClick: openProtocol }]}
                      onDelete={() => handleDelete(protocol)}
                      deleteDisabled={protocol.status === 'active'}
                      deleteDisabledTitle="Arquive a rotina antes de excluir"
                    />
                  </div>
                </div>
                <div className="date-display text-sm text-muted">
                  <Calendar size={14} strokeWidth={2} aria-hidden="true" />
                  {formatDateForDisplay(protocol.startDate)}
                  <span className="date-display__divider">–</span>
                  {formatDateForDisplay(protocol.expirationDate)}
                </div>
              </div>
            );
          })}
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
                Confirmar
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

export default StudentProtocols;
