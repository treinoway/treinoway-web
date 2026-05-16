import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import FinanceiroHero from './FinanceiroHero';

const defaultProps = {
  yearMonth: '2026-05',
  onYearMonthChange: vi.fn(),
  paidAmount: 9840,
  pendingAmount: 1620,
  pendingStudents: 3,
  overdueAmount: 540,
  overdueStudents: 1,
  overdueDays: 12,
  totalStudentsBilled: 28,
  waveformBars: [],
};

describe('FinanceiroHero', () => {
  it('renders the page title', () => {
    render(<FinanceiroHero {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Financeiro' })).toBeInTheDocument();
  });

  it('renders the current period label', () => {
    render(<FinanceiroHero {...defaultProps} />);
    expect(screen.getByText('Mai · 2026')).toBeInTheDocument();
  });

  it('renders all four KPI labels', () => {
    render(<FinanceiroHero {...defaultProps} />);
    expect(screen.getByText('MRR Recebido')).toBeInTheDocument();
    // 'Pendente' and 'Atrasado' also appear in the waveform legend — use getAllByText
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Atrasado').length).toBeGreaterThan(0);
    expect(screen.getByText('Inadimplência')).toBeInTheDocument();
  });

  it('renders the subtitle with student counts', () => {
    render(<FinanceiroHero {...defaultProps} />);
    expect(screen.getByText(/28 alunos cobrados/)).toBeInTheDocument();
    expect(screen.getByText(/1 ainda deve/)).toBeInTheDocument();
  });

  it('calls onYearMonthChange with previous month when left arrow is clicked', async () => {
    const user = userEvent.setup();
    const onYearMonthChange = vi.fn();
    render(<FinanceiroHero {...defaultProps} onYearMonthChange={onYearMonthChange} />);
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(onYearMonthChange).toHaveBeenCalledWith('2026-04');
  });

  it('calls onYearMonthChange with next month when right arrow is clicked', async () => {
    const user = userEvent.setup();
    const onYearMonthChange = vi.fn();
    render(<FinanceiroHero {...defaultProps} onYearMonthChange={onYearMonthChange} />);
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(onYearMonthChange).toHaveBeenCalledWith('2026-06');
  });

  it('wraps year correctly when navigating before January', async () => {
    const user = userEvent.setup();
    const onYearMonthChange = vi.fn();
    render(
      <FinanceiroHero
        {...defaultProps}
        yearMonth="2026-01"
        onYearMonthChange={onYearMonthChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(onYearMonthChange).toHaveBeenCalledWith('2025-12');
  });

  it('renders delinquency rate as percentage of overdue/total', () => {
    render(<FinanceiroHero {...defaultProps} />);
    // 1 overdue / 28 total = 3.6%
    expect(screen.getByText('3.6')).toBeInTheDocument();
  });

  it('does not render subtitle when no students are billed', () => {
    render(
      <FinanceiroHero
        {...defaultProps}
        totalStudentsBilled={0}
        overdueStudents={0}
      />,
    );
    expect(screen.queryByText(/alunos cobrados/)).not.toBeInTheDocument();
  });

  it('renders the waveform region', () => {
    render(<FinanceiroHero {...defaultProps} />);
    expect(
      screen.getByRole('group', { name: 'Receita dos últimos 30 dias' }),
    ).toBeInTheDocument();
  });
});
