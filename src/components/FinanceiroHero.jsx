import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import RevenueWaveform from './RevenueWaveform';
import { formatCurrencyBRL } from '../utils/currencyFormat';

const SHORT_MONTH_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const formatPeriodLabel = (yearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(yearMonth || ''));
  if (!match) return yearMonth;
  const monthIndex = Number(match[2]) - 1;
  return `${SHORT_MONTH_PT[monthIndex] ?? ''} · ${match[1]}`;
};

const prevYearMonth = (yearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(yearMonth || ''));
  if (!match) return yearMonth;
  let year = Number(match[1]);
  let month = Number(match[2]) - 1;
  if (month < 1) { month = 12; year -= 1; }
  return `${year}-${String(month).padStart(2, '0')}`;
};

const nextYearMonth = (yearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(yearMonth || ''));
  if (!match) return yearMonth;
  let year = Number(match[1]);
  let month = Number(match[2]) + 1;
  if (month > 12) { month = 1; year += 1; }
  return `${year}-${String(month).padStart(2, '0')}`;
};

// Strip "R$ " prefix — hero renders currency symbol separately as a smaller span
const formatAmountOnly = (amount) => {
  const str = formatCurrencyBRL(amount);
  return str.replace(/^R\$\s*/, '').trim();
};

/**
 * Athletic-Tech stadium hero for the Financeiro page.
 * 4 KPIs (MRR received, pending, overdue, delinquency rate) + 30-bar revenue waveform.
 */
const FinanceiroHero = ({
  yearMonth,
  onYearMonthChange,
  paidAmount,
  pendingAmount,
  pendingStudents,
  overdueAmount,
  overdueStudents,
  overdueDays,
  totalStudentsBilled,
  waveformBars,
}) => {
  const delinquencyRate = totalStudentsBilled > 0
    ? ((overdueStudents / totalStudentsBilled) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="fin-hero">
      <div className="fin-hero-top">
        <div>
          <div className="fin-hero-eyebrow">
            <span className="fin-hero-eyebrow-dot" aria-hidden="true" />
            Receita · Mês corrente
          </div>
          <h1 className="fin-hero-title">Financeiro</h1>
          {totalStudentsBilled > 0 && (
            <p className="fin-hero-subtitle">
              {totalStudentsBilled} {totalStudentsBilled === 1 ? 'aluno cobrado' : 'alunos cobrados'} este mês
              {overdueStudents > 0 && `. ${overdueStudents} ${overdueStudents === 1 ? 'ainda deve' : 'ainda devem'}.`}
            </p>
          )}
        </div>

        <div className="fin-period-picker" role="group" aria-label="Selecionar mês">
          <button
            type="button"
            className="fin-period-picker-btn"
            aria-label="Mês anterior"
            onClick={() => onYearMonthChange(prevYearMonth(yearMonth))}
          >
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <span className="fin-period-picker-label">{formatPeriodLabel(yearMonth)}</span>
          <button
            type="button"
            className="fin-period-picker-btn"
            aria-label="Próximo mês"
            onClick={() => onYearMonthChange(nextYearMonth(yearMonth))}
          >
            <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="fin-hero-kpis">
        {/* KPI 1 — MRR Recebido (hero 56px) */}
        <div className="fin-hero-kpi">
          <span className="fin-kpi-label">MRR Recebido</span>
          <span className="fin-kpi-value fin-kpi-value--hero">
            <span className="fin-kpi-currency">R$</span>
            {formatAmountOnly(paidAmount)}
          </span>
          <span className="fin-kpi-delta fin-kpi-delta--up">
            <TrendingUp size={12} strokeWidth={2.5} aria-hidden="true" />
            Mês corrente
          </span>
        </div>

        {/* KPI 2 — Pendente */}
        <div className="fin-hero-kpi">
          <span className="fin-kpi-label">Pendente</span>
          <span className="fin-kpi-value fin-kpi-value--default">
            <span className="fin-kpi-currency">R$</span>
            {formatAmountOnly(pendingAmount)}
          </span>
          {pendingStudents > 0 && (
            <span className="fin-kpi-foot">
              {pendingStudents} {pendingStudents === 1 ? 'aluno' : 'alunos'}
            </span>
          )}
        </div>

        {/* KPI 3 — Atrasado */}
        <div className="fin-hero-kpi">
          <span className="fin-kpi-label">Atrasado</span>
          <span className="fin-kpi-value fin-kpi-value--default fin-kpi-value--overdue">
            <span className="fin-kpi-currency fin-kpi-currency--overdue">R$</span>
            {formatAmountOnly(overdueAmount)}
          </span>
          {overdueStudents > 0 && (
            <span className="fin-kpi-foot fin-kpi-foot--overdue">
              {overdueStudents} {overdueStudents === 1 ? 'aluno' : 'alunos'}
              {overdueDays > 0 && ` · ${overdueDays}d`}
            </span>
          )}
        </div>

        {/* KPI 4 — Inadimplência % */}
        <div className="fin-hero-kpi">
          <span className="fin-kpi-label">Inadimplência</span>
          <span className="fin-kpi-value fin-kpi-value--default">
            {delinquencyRate}
            <span className="fin-kpi-percent">%</span>
          </span>
          <span className="fin-kpi-delta fin-kpi-delta--up">
            <TrendingDown size={12} strokeWidth={2.5} aria-hidden="true" />
            Alunos em atraso
          </span>
        </div>
      </div>

      <RevenueWaveform bars={waveformBars} />
    </div>
  );
};

FinanceiroHero.propTypes = {
  yearMonth: PropTypes.string.isRequired,
  onYearMonthChange: PropTypes.func.isRequired,
  paidAmount: PropTypes.number,
  pendingAmount: PropTypes.number,
  pendingStudents: PropTypes.number,
  overdueAmount: PropTypes.number,
  overdueStudents: PropTypes.number,
  overdueDays: PropTypes.number,
  totalStudentsBilled: PropTypes.number,
  waveformBars: PropTypes.array,
};

FinanceiroHero.defaultProps = {
  paidAmount: 0,
  pendingAmount: 0,
  pendingStudents: 0,
  overdueAmount: 0,
  overdueStudents: 0,
  overdueDays: 0,
  totalStudentsBilled: 0,
  waveformBars: [],
};

export default FinanceiroHero;
