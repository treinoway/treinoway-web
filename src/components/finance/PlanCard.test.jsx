import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import PlanCard from './PlanCard';
import { useAuth } from '../../contexts/AuthContext';
import {
  DUAL_ROLE,
  NUTRITIONIST_ONLY,
  TRAINER_ONLY,
  authAs,
  bothPlan,
  makePlan,
  nutritionPlan,
} from '../../test/financeFixtures';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

// Test helper: renders one plan card.
const renderCard = (plan) => render(<PlanCard plan={plan} onEdit={vi.fn()} onArchiveToggle={vi.fn()} />);

describe('PlanCard', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authAs(TRAINER_ONLY));
  });

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
  describe('service type tag (dual-role only)', () => {
    it.each([
      [makePlan(), 'Treino'],
      [nutritionPlan(), 'Nutrição'],
      [bothPlan(), 'Ambos'],
    ])('dual-role: shows the plan tag as a DS Badge with the tag variant', (plan, label) => {
      vi.mocked(useAuth).mockReturnValue(authAs(DUAL_ROLE));
      const { container } = renderCard(plan);
      const badge = container.querySelector('.badge.badge--tag');
      expect(badge).not.toBeNull();
      expect(badge).toHaveTextContent(label);
      expect(badge.tagName).toBe('SPAN');
    });

    it('dual-role: keeps the archived status badge apart from the tag badge', () => {
      vi.mocked(useAuth).mockReturnValue(authAs(DUAL_ROLE));
      const { container } = renderCard(nutritionPlan({ isArchived: true }));
      expect(container.querySelector('.badge.badge--tag')).toHaveTextContent('Nutrição');
      expect(container.querySelector('.badge.badge--status')).toHaveTextContent('Arquivado');
    });

    it.each([
      ['trainer-only', TRAINER_ONLY, makePlan()],
      ['nutritionist-only', NUTRITIONIST_ONLY, nutritionPlan()],
    ])('%s: shows no tag badge', (_label, roles, plan) => {
      vi.mocked(useAuth).mockReturnValue(authAs(roles));
      const { container } = renderCard(plan);
      expect(container.querySelector('.badge--tag')).toBeNull();
      expect(screen.queryByText(/^(Treino|Nutrição|Ambos)$/)).not.toBeInTheDocument();
    });
  });

  describe('subscriber count by role', () => {
    it('nutritionist-only: counts "pacientes"', () => {
      vi.mocked(useAuth).mockReturnValue(authAs(NUTRITIONIST_ONLY));
      const { rerender } = renderCard(nutritionPlan({ activeSubscriptionCount: 4 }));
      expect(screen.getByText('Mensal · 4 pacientes')).toBeInTheDocument();
      rerender(<PlanCard plan={nutritionPlan({ activeSubscriptionCount: 1 })} onEdit={vi.fn()} onArchiveToggle={vi.fn()} />);
      expect(screen.getByText('Mensal · 1 paciente')).toBeInTheDocument();
    });

    it('trainer-only: keeps "alunos" even when the API sends the split count', () => {
      renderCard(makePlan({ activeSubscriptionCount: 4, activeSubscriptionCountByKind: { students: 4, patients: 0 } }));
      expect(screen.getByText('Mensal · 4 alunos')).toBeInTheDocument();
    });

    it('dual-role: splits the count by kind from activeSubscriptionCountByKind', () => {
      vi.mocked(useAuth).mockReturnValue(authAs(DUAL_ROLE));
      renderCard(bothPlan({ activeSubscriptionCount: 3, activeSubscriptionCountByKind: { students: 2, patients: 1 } }));
      expect(screen.getByText(/2 alunos · 1 paciente/)).toBeInTheDocument();
      expect(screen.queryByText(/cliente/i)).not.toBeInTheDocument();
    });
  });
});
