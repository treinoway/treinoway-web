import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import PlanCard from './PlanCard';
import { makePlan } from '../../test/financeFixtures';

describe('PlanCard', () => {
  it('shows name, recurrence, subscriber count and the half-up net price', () => {
    render(<PlanCard plan={makePlan({ discountPercent: '33.33' })} onEdit={vi.fn()} onArchiveToggle={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Consultoria Mensal' })).toBeInTheDocument();
    expect(screen.getByText('Mensal · 4 alunos')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?66,60/)).toBeInTheDocument();
    expect(screen.getByText('por mês')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?99,90 − 33,33%/)).toBeInTheDocument();
  });

  it('uses singular and hides the count when the API does not send it', () => {
    const { rerender } = render(
      <PlanCard plan={makePlan({ activeSubscriptionCount: 1 })} onEdit={vi.fn()} onArchiveToggle={vi.fn()} />,
    );
    expect(screen.getByText('Mensal · 1 aluno')).toBeInTheDocument();
    rerender(<PlanCard plan={makePlan({ activeSubscriptionCount: undefined })} onEdit={vi.fn()} onArchiveToggle={vi.fn()} />);
    expect(screen.getByText('Mensal')).toBeInTheDocument();
  });

  it('shows the fixed-amount discount line and the annual period', () => {
    render(
      <PlanCard
        plan={makePlan({ recurrence: 'annual', recurrenceLabel: 'Anual', price: '990.00', discountAmount: '90.00' })}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/R\$\s?900,00/)).toBeInTheDocument();
    expect(screen.getByText('por ano')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?990,00 − R\$\s?90,00/)).toBeInTheDocument();
  });

  it('shows the billing day only when the plan has one', () => {
    const { rerender } = render(
      <PlanCard plan={makePlan({ billingDay: 5 })} onEdit={vi.fn()} onArchiveToggle={vi.fn()} />,
    );
    expect(screen.getByText(/dia 5/i)).toBeInTheDocument();
    rerender(<PlanCard plan={makePlan({ billingDay: null })} onEdit={vi.fn()} onArchiveToggle={vi.fn()} />);
    expect(screen.queryByText(/dia \d/i)).not.toBeInTheDocument();
  });

  it('edits and archives through the row menu', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onArchiveToggle = vi.fn();
    const plan = makePlan();
    render(<PlanCard plan={plan} onEdit={onEdit} onArchiveToggle={onArchiveToggle} />);

    await user.click(screen.getByRole('button', { name: 'Ações do plano Consultoria Mensal' }));
    await user.click(screen.getByRole('button', { name: 'Editar plano' }));
    expect(onEdit).toHaveBeenCalledWith(plan);

    await user.click(screen.getByRole('button', { name: 'Ações do plano Consultoria Mensal' }));
    await user.click(screen.getByRole('button', { name: 'Arquivar plano' }));
    expect(onArchiveToggle).toHaveBeenCalledWith(plan);
  });

  it('marks archived plans and offers "Desarquivar plano"', async () => {
    const user = userEvent.setup();
    render(<PlanCard plan={makePlan({ isArchived: true })} onEdit={vi.fn()} onArchiveToggle={vi.fn()} />);

    expect(screen.getByText('Mensal · Arquivado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ações do plano Consultoria Mensal' }));
    expect(screen.getByRole('button', { name: 'Desarquivar plano' })).toBeInTheDocument();
  });
});
