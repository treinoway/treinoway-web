import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { POINT_ACTION_LABEL } from '../../constants/gamification';

const StudentPoints = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);

  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusPoints, setBonusPoints] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [awarding, setAwarding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/trainer/students/${studentId}/points?page=${page}&limit=${limit}`);
      setTransactions(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [studentId, page, limit, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleAwardBonus = async (e) => {
    e.preventDefault();
    const points = Number.parseInt(bonusPoints, 10);
    if (!Number.isInteger(points) || points < 1 || points > 10000) {
      showToast('Informe um valor entre 1 e 10000.', 'error');
      return;
    }
    setAwarding(true);
    try {
      const body = { points };
      if (bonusReason.trim()) body.reason = bonusReason.trim();
      await api.post(`/trainer/students/${studentId}/bonus`, body);
      setShowBonusModal(false);
      setBonusPoints('');
      setBonusReason('');
      setPage(1);
      await load();
      showToast('Bônus concedido!', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setAwarding(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <button
          type="button"
          onClick={() => navigate(`/trainer/students/${studentId}`)}
          className="btn-back"
          aria-label="Voltar para aluno"
        >
          <ArrowLeft size={16} strokeWidth={1.6} /> Aluno
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Pontos do aluno</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowBonusModal(true)}
        >
          <Plus size={16} strokeWidth={1.6} /> Conceder bônus
        </button>
      </div>

      {loading && (
        <div className="loading-screen"><span className="loading-text">Carregando...</span></div>
      )}

      {!loading && transactions.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum ponto registrado.</p>
        </div>
      )}

      {!loading && transactions.length > 0 && (
        <>
          <ul className="point-history-list">
            {transactions.map((t) => (
              <li key={t.id} className="point-history-row">
                <div>
                  <span className="font-medium">{POINT_ACTION_LABEL[t.action] || t.action}</span>
                  {t.reason && <p className="text-sm text-muted">{t.reason}</p>}
                  <p className="text-sm text-light">{formatDateForDisplay(t.createdAt)}</p>
                </div>
                <span className="point-history-points">{t.points > 0 ? `+${t.points}` : t.points}</span>
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <div className="btn-group" style={{ marginTop: 'var(--spacing-md)' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >Anterior</button>
              <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>
                Página {page} de {pageCount}
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
              >Próxima</button>
            </div>
          )}
        </>
      )}

      {showBonusModal && (
        <div className="overlay" onClick={() => setShowBonusModal(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h3 className="bottom-sheet-title">Conceder bônus</h3>
              <button
                type="button"
                className="bottom-sheet-close"
                onClick={() => setShowBonusModal(false)}
                aria-label="Fechar"
              >×</button>
            </div>
            <div className="bottom-sheet-body">
              <form onSubmit={handleAwardBonus} className="form">
                <div className="form-group">
                  <label className="form-label" htmlFor="bonus-points">Pontos</label>
                  <input
                    id="bonus-points"
                    type="number"
                    min="1"
                    max="10000"
                    className="form-input"
                    value={bonusPoints}
                    onChange={(e) => setBonusPoints(e.target.value)}
                    disabled={awarding}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="bonus-reason">Motivo (opcional)</label>
                  <textarea
                    id="bonus-reason"
                    className="form-textarea"
                    value={bonusReason}
                    onChange={(e) => setBonusReason(e.target.value.slice(0, 300))}
                    rows={3}
                    maxLength={300}
                    disabled={awarding}
                  />
                </div>
                <div className="btn-group">
                  <button type="submit" className="btn-primary" disabled={awarding}>
                    {awarding ? 'Concedendo...' : 'Conceder'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowBonusModal(false)}
                    disabled={awarding}
                  >Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPoints;
