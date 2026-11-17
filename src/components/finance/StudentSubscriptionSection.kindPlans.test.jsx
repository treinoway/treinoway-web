import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PropTypes from 'prop-types';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import StudentSubscriptionSection from './StudentSubscriptionSection';
import useStudentSubscriptionManager from '../../hooks/useStudentSubscriptionManager';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { DUAL_ROLE, authAs, bothPlan, makePlan, nutritionPlan, pinFinanceClock } from '../../test/financeFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const STUDENT_ID = 'student-1';
const QUICK_CREATE_INTRO = /Você ainda não tem planos/;
const NO_TRAINING_PLAN = 'Nenhum plano de treino ativo.';
const NO_NUTRITION_PLAN = 'Nenhum plano de nutrição ativo.';

let plans;

// Test helper: answers the subscription block requests (no active plan, no payments).
const mockApi = () => {
  api.get.mockImplementation((url) => {
    if (url === `/professional/students/${STUDENT_ID}/subscriptions/active`) return Promise.resolve({ data: null });
    if (url === `/professional/students/${STUDENT_ID}/payments`) {
      return Promise.resolve({ data: { student: { id: STUDENT_ID, name: 'Maria Silva', avatarUrl: null }, summary: null, payments: [] } });
    }
    if (url === '/professional/subscription-plans') return Promise.resolve({ data: plans });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

// Wires the real manager hook to the section, as StudentDetail and PlanSummary do.
const Harness = ({ serviceKind }) => {
  const manager = useStudentSubscriptionManager(STUDENT_ID, 'Maria Silva', serviceKind);
  return <StudentSubscriptionSection manager={manager} onViewHistory={vi.fn()} />;
};

Harness.propTypes = { serviceKind: PropTypes.string.isRequired };

// Test helper: renders the block for a kind and opens "Atribuir plano".
const openAssign = async (serviceKind) => {
  const user = userEvent.setup();
  render(<Harness serviceKind={serviceKind} />);
  await screen.findByText('Sem plano ativo');
  await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
  return user;
};

describe('Atribuir plano for a dual-role user whose plans are all of the other kind', () => {
  beforeEach(() => {
    pinFinanceClock();
    vi.clearAllMocks();
    localStorage.clear();
    useToast.mockReturnValue({ showToast: vi.fn() });
    useAuth.mockReturnValue(authAs(DUAL_ROLE));
    plans = [];
    mockApi();
  });

  afterEach(() => vi.useRealTimers());

  it('on a student page (training) with only Nutrição plans says "Nenhum plano de treino ativo." and offers no quick-create', async () => {
    plans = [nutritionPlan()];
    await openAssign('training');

    expect(await screen.findByText(NO_TRAINING_PLAN)).toBeInTheDocument();
    expect(screen.queryByText(QUICK_CREATE_INTRO)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Acompanhamento Nutricional/ })).not.toBeInTheDocument();
  });

  it('on a patient page (nutrition) with only Treino plans says "Nenhum plano de nutrição ativo." and offers no quick-create', async () => {
    plans = [makePlan()];
    await openAssign('nutrition');

    expect(await screen.findByText(NO_NUTRITION_PLAN)).toBeInTheDocument();
    expect(screen.queryByText(QUICK_CREATE_INTRO)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Consultoria Mensal/ })).not.toBeInTheDocument();
  });

  it('keeps the quick-create when the user has no plans at all', async () => {
    plans = [];
    await openAssign('training');

    expect(await screen.findByText(QUICK_CREATE_INTRO)).toBeInTheDocument();
    expect(screen.queryByText(NO_TRAINING_PLAN)).not.toBeInTheDocument();
  });

  it('lists the plans of the page kind plus Ambos, without any notice, when there are some', async () => {
    plans = [nutritionPlan(), bothPlan()];
    await openAssign('training');

    const dialog = await screen.findByRole('dialog', { name: 'Atribuir plano' });
    expect(within(dialog).getByRole('radio', { name: /Treino e Dieta/ })).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio', { name: /Acompanhamento Nutricional/ })).not.toBeInTheDocument();
    expect(screen.queryByText(NO_TRAINING_PLAN)).not.toBeInTheDocument();
    expect(screen.queryByText(QUICK_CREATE_INTRO)).not.toBeInTheDocument();
  });
});
