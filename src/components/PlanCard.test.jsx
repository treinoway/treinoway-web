import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import PlanCard from './PlanCard';

const basePlan = {
  id: 'plan-1',
  name: 'Plano Mensal',
  recurrence: 'monthly',
  recurrenceLabel: 'Mensal',
  price: '270.00',
  isArchived: false,
};

describe('PlanCard', () => {
  it('renders plan name, recurrence and price', () => {
    render(
      <PlanCard
        plan={basePlan}
        subscribersCount={5}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
      />,
    );
    expect(screen.getByText('Plano Mensal')).toBeInTheDocument();
    expect(screen.getByText('Mensal')).toBeInTheDocument();
    expect(screen.getByText(/270/)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders subscriber count in the stats block', () => {
    render(
      <PlanCard
        plan={basePlan}
        subscribersCount={1}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
      />,
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Assinantes')).toBeInTheDocument();
  });

  it('calls onEdit when "Editar" is clicked from the menu', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <PlanCard
        plan={basePlan}
        subscribersCount={0}
        onEdit={onEdit}
        onArchiveToggle={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Ações do plano/ }));
    await user.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it('exposes "Arquivar" option when the plan is active', async () => {
    const user = userEvent.setup();
    const onArchiveToggle = vi.fn();
    render(
      <PlanCard
        plan={basePlan}
        subscribersCount={0}
        onEdit={vi.fn()}
        onArchiveToggle={onArchiveToggle}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Ações do plano/ }));
    await user.click(screen.getByText('Arquivar'));
    expect(onArchiveToggle).toHaveBeenCalledOnce();
  });

  it('exposes "Desarquivar" when the plan is archived', async () => {
    const user = userEvent.setup();
    const onArchiveToggle = vi.fn();
    render(
      <PlanCard
        plan={{ ...basePlan, isArchived: true }}
        subscribersCount={0}
        onEdit={vi.fn()}
        onArchiveToggle={onArchiveToggle}
      />,
    );
    expect(screen.getByText('Arquivado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ações do plano/ }));
    await user.click(screen.getByText('Desarquivar'));
    expect(onArchiveToggle).toHaveBeenCalledOnce();
  });

  it('applies featured class and eyebrow when featured prop is true', () => {
    const { container } = render(
      <PlanCard
        plan={basePlan}
        subscribersCount={10}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        featured
      />,
    );
    expect(container.querySelector('.fin-plan-card--featured')).toBeInTheDocument();
    expect(screen.getByText('Plano destaque')).toBeInTheDocument();
  });

  it('does not apply featured class when featured is false', () => {
    const { container } = render(
      <PlanCard
        plan={basePlan}
        subscribersCount={0}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
        featured={false}
      />,
    );
    expect(container.querySelector('.fin-plan-card--featured')).not.toBeInTheDocument();
    expect(screen.queryByText('Plano destaque')).not.toBeInTheDocument();
  });

  it('renders total revenue stat when provided', () => {
    render(
      <PlanCard
        plan={basePlan}
        subscribersCount={3}
        totalRevenue={810}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
      />,
    );
    expect(screen.getByText('Receita gerada')).toBeInTheDocument();
  });

  it('does not render revenue stat when totalRevenue is not provided', () => {
    render(
      <PlanCard
        plan={basePlan}
        subscribersCount={3}
        onEdit={vi.fn()}
        onArchiveToggle={vi.fn()}
      />,
    );
    expect(screen.queryByText('Receita gerada')).not.toBeInTheDocument();
  });
});
