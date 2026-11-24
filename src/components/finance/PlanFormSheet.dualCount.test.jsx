import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import PlanFormSheet from './PlanFormSheet';
import { useAuth } from '../../contexts/AuthContext';
import { DUAL_ROLE, TRAINER_ONLY, authAs, bothPlan, makePlan } from '../../test/financeFixtures';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

// Test helper: opens the edit sheet for a plan and changes its price so the banner shows.
const editPriceOf = async (plan) => {
  const user = userEvent.setup();
  render(<PlanFormSheet plan={plan} onClose={vi.fn()} onSubmit={vi.fn().mockResolvedValue(undefined)} />);
  const price = screen.getByLabelText('Valor por cobrança (R$)');
  await user.clear(price);
  await user.type(price, '120');
  return screen.getByRole('note');
};

describe('PlanFormSheet — price-change banner counts by kind', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(authAs(DUAL_ROLE));
  });

  it('dual-role: says "2 alunos · 1 paciente", as the plan card does, instead of "3 clientes"', async () => {
    const banner = await editPriceOf(bothPlan({ activeSubscriptionCount: 3, activeSubscriptionCountByKind: { students: 2, patients: 1 } }));

    expect(banner).toHaveTextContent(/2 alunos · 1 paciente com este plano continuam pagando R\$\s?99,90/);
    expect(banner).not.toHaveTextContent(/cliente/);
  });

  it('dual-role: names only the kind that has subscribers ("1 paciente")', async () => {
    const banner = await editPriceOf(bothPlan({ activeSubscriptionCount: 1, activeSubscriptionCountByKind: { students: 0, patients: 1 } }));

    expect(banner).toHaveTextContent(/^O novo valor vale só para novas assinaturas\. 1 paciente com este plano/);
    expect(banner).not.toHaveTextContent(/aluno|cliente/);
  });

  it('trainer-only: keeps "4 alunos"', async () => {
    vi.mocked(useAuth).mockReturnValue(authAs(TRAINER_ONLY));
    const banner = await editPriceOf(makePlan({ activeSubscriptionCount: 4, activeSubscriptionCountByKind: { students: 4, patients: 0 } }));

    expect(banner).toHaveTextContent(/4 alunos com este plano continuam pagando/);
  });
});
