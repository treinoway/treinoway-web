import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import SkeletonRows from '../ds/SkeletonRows';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { POINT_ACTION_LABEL } from '../../constants/gamification';

const PAGE_SIZE = 10;
const ACTION_ORDER = Object.keys(POINT_ACTION_LABEL);

// Label of a point action, the raw action when it has none
const actionLabelOf = (action) => POINT_ACTION_LABEL[action] || action;

// Breakdown entries in the order of the point actions, unknown actions last
const orderedBreakdownOf = (breakdown) => Object.entries(breakdown || {}).sort(([a], [b]) => {
  const rank = (action) => (ACTION_ORDER.includes(action) ? ACTION_ORDER.indexOf(action) : ACTION_ORDER.length);
  return rank(a) - rank(b);
});

// "+10" for a gain, "-5" for a loss
const signedPointsOf = (points) => (points > 0 ? `+${points}` : `${points}`);

// Loads the XP summary once and the history page by page; toasts a failure
const usePoints = (challengeId, page) => {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState({ items: [], total: 0, page: null });

  useEffect(() => {
    let mounted = true;
    api.get(`/my/points/summary?challengeId=${challengeId}`)
      .then((response) => { if (mounted) setSummary(response.data); })
      .catch((error) => { if (mounted) showToast(error.userMessage || translateError(error), 'error'); });
    return () => { mounted = false; };
  }, [challengeId, showToast]);

  useEffect(() => {
    let mounted = true;
    api.get(`/my/points?challengeId=${challengeId}&page=${page}&limit=${PAGE_SIZE}`)
      .then((response) => { if (mounted) setHistory({ items: response.data.data || [], total: response.data.total || 0, page }); })
      .catch((error) => {
        if (!mounted) return;
        showToast(error.userMessage || translateError(error), 'error');
        setHistory((current) => ({ ...current, page }));
      });
    return () => { mounted = false; };
  }, [challengeId, page, showToast]);

  return { summary, history: { ...history, loading: history.page !== page } };
};

// "Resumo" card: points earned by action
const SummaryCard = ({ summary }) => {
  const entries = orderedBreakdownOf(summary?.breakdown);
  return (
    <section className="section-card my-points-card" aria-label="Resumo">
      <h2 className="my-ranking-card__title type-h3">Resumo</h2>
      {!summary && <SkeletonRows label="Carregando resumo" count={3} />}
      {summary && entries.length === 0 && <p className="my-ranking-card__note type-body">Nenhum ponto registrado ainda.</p>}
      {entries.length > 0 && (
        <dl className="my-points-summary">
          {entries.map(([action, points]) => (
            <div key={action} className="my-points-summary__row">
              <dt className="my-points-summary__label type-caption">{actionLabelOf(action)}</dt>
              <dd className="my-points-summary__value type-body-lg-strong">{points}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
};

SummaryCard.propTypes = {
  summary: PropTypes.shape({ totalPoints: PropTypes.number, breakdown: PropTypes.object }),
};

// "Anterior" and "Próxima" under the history
const Pager = ({ page, pageCount, onPageChange }) => (
  <div className="my-points-pager">
    <button type="button" className="btn btn--neutral" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
    <button type="button" className="btn btn--neutral" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>Próxima</button>
  </div>
);

Pager.propTypes = {
  page: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

// One history row: action, date and the signed points
const HistoryRow = ({ transaction }) => (
  <li className="my-points-history__row">
    <span className="my-points-history__identity">
      <span className="type-body">{actionLabelOf(transaction.action)}</span>
      <span className="my-points-history__date type-caption">{formatDateForDisplay(transaction.createdAt)}</span>
    </span>
    <span className={`my-points-history__points type-body-lg-strong${transaction.points > 0 ? ' my-points-history__points--gain' : ''}`}>{signedPointsOf(transaction.points)}</span>
  </li>
);

HistoryRow.propTypes = {
  transaction: PropTypes.shape({ action: PropTypes.string.isRequired, points: PropTypes.number.isRequired, createdAt: PropTypes.string }).isRequired,
};

// "Histórico" card: the page of XP transactions and the pager
const HistoryCard = ({ history, page, onPageChange }) => {
  const pageCount = Math.max(1, Math.ceil(history.total / PAGE_SIZE));
  const empty = !history.loading && history.items.length === 0;
  return (
    <section className="section-card my-points-card" aria-label="Histórico">
      <h2 className="my-ranking-card__title type-h3">Histórico</h2>
      {history.loading && <SkeletonRows label="Carregando histórico" count={4} />}
      {empty && <p className="my-ranking-card__note type-body">Nenhum ponto registrado ainda.</p>}
      {!history.loading && history.items.length > 0 && (
        <ul className="my-points-history">{history.items.map((transaction) => <HistoryRow key={transaction.id} transaction={transaction} />)}</ul>
      )}
      {pageCount > 1 && <Pager page={page} pageCount={pageCount} onPageChange={onPageChange} />}
    </section>
  );
};

HistoryCard.propTypes = {
  history: PropTypes.shape({ items: PropTypes.array.isRequired, total: PropTypes.number.isRequired, loading: PropTypes.bool.isRequired }).isRequired,
  page: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

// "Meus Pontos" of a championship: XP summary by action and the paged history, as ds-aluno-campeonato-pontos.png
const MyPointsTab = ({ challengeId }) => {
  const [page, setPage] = useState(1);
  const { summary, history } = usePoints(challengeId, page);
  return (
    <div className="my-points">
      <SummaryCard summary={summary} />
      <HistoryCard history={history} page={page} onPageChange={setPage} />
    </div>
  );
};

MyPointsTab.propTypes = {
  challengeId: PropTypes.string.isRequired,
};

export default MyPointsTab;
