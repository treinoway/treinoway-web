import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor, within } from '../../test/test-utils';
import PlanSummary from './PlanSummary';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PATIENT_ID, buildOverview, buildPlan } from '../../test/nutritionFixtures';
import { NUTRITIONIST_ONLY, authAs, nutritionPlan, overduePayment, pinFinanceClock } from '../../test/financeFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const showToast = vi.fn();
const ROUTE = `/nutritionist/patients/${PATIENT_ID}/plan`;
const ACTIVE_URL = `/professional/students/${PATIENT_ID}/subscriptions/active`;
const PAYMENTS_URL = `/professional/students/${PATIENT_ID}/payments`;
const ASSIGN_URL = `/professional/students/${PATIENT_ID}/subscriptions`;

const activeSubscription = {
  id: 'sub-1',
  planId: 'plan-nutri',
  recurrence: 'monthly',
  price: '99.90',
  discountPercent: null,
  discountAmount: null,
  startDate: '2026-09-01',
  serviceType: 'nutrition',
  trainerId: null,
  nutritionistId: 'nutritionist-1',
};

const quarterlyPlan = nutritionPlan({ id: 'plan-n2', name: 'Nutri Trimestral', recurrence: 'quarterly', recurrenceLabel: 'Trimestral' });

// Test helper: answers the nutrition and /professional/* billing requests.
const mockApi = ({ subscription = null, payments = [], plans = [nutritionPlan(), quarterlyPlan] } = {}) => {
  const routes = {
    [`/nutritionist/patients/${PATIENT_ID}/plan`]: buildPlan({ status: 'published', hasUnpublishedChanges: false }),
    [`/nutritionist/patients/${PATIENT_ID}/overview`]: buildOverview(),
    [ACTIVE_URL]: subscription,
    [PAYMENTS_URL]: { student: { id: PATIENT_ID, name: 'Luiza Andrade', avatarUrl: null }, summary: null, payments },
    '/professional/subscription-plans': plans,
  };
  api.get.mockImplementation((url) => Promise.resolve({ data: url in routes ? routes[url] : {} }));
};

// Prints the current location so navigation can be asserted.
const LocationProbe = () => {
  const location = useLocation();
  return <output aria-label="location">{location.pathname}</output>;
};

// Test helper: renders the patient page with the finance history route next to it.
const renderPage = () => render(
  <MemoryRouter initialEntries={[ROUTE]}>
    <Routes>
      <Route path="/nutritionist/patients/:patientId/plan" element={<PlanSummary />} />
      <Route path="/financeiro/alunos/:studentId" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>,
);

// Test helper: opens the Financeiro tab and returns the subscription block card.
const openFinanceTab = async (user) => {
  await screen.findByRole('heading', { name: 'Luiza Andrade' });
  await user.click(screen.getByRole('tab', { name: 'Financeiro' }));
  const heading = await screen.findByRole('heading', { name: /^(Sem plano ativo|Acompanhamento Nutricional)$/ });
  return heading.closest('.section-card');
};

describe('PlanSummary — Financeiro tab (nutritionist)', () => {
  beforeEach(() => {
    pinFinanceClock();
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(useAuth).mockReturnValue(authAs(NUTRITIONIST_ONLY));
    mockApi();
  });

  afterEach(() => vi.useRealTimers());

  it('adds a "Financeiro" tab after the existing ones, unselected by default', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Luiza Andrade' });
    const tabs = screen.getAllByRole('tab').filter((tab) => tab.closest('[aria-label="Seções do paciente"]'));
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Plano alimentar', 'Anamnese', 'Acompanhamento', 'Evolução', 'Financeiro']);
    expect(screen.getByRole('tab', { name: 'Financeiro' })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows the subscription block of the patient inside a .section-card, loaded from /professional/*', async () => {
    const user = userEvent.setup();
    renderPage();
    const card = await openFinanceTab(user);

    expect(screen.getByRole('tab', { name: 'Financeiro' })).toHaveAttribute('aria-selected', 'true');
    expect(card).not.toBeNull();
    expect(card).toHaveClass('section-card');
    expect(within(card).getByText('Sem plano ativo')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Refeições do plano' })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(ACTIVE_URL);
    expect(api.get).toHaveBeenCalledWith(PAYMENTS_URL);
  });

  it('reads "paciente" in the empty block copy', async () => {
    const user = userEvent.setup();
    renderPage();
    const card = await openFinanceTab(user);
    expect(within(card).getByText('Atribua um plano para registrar as cobranças deste paciente.')).toBeInTheDocument();
    expect(card.textContent).not.toMatch(/aluno/i);
  });

  it('assigns a plan to the patient through POST /professional/students/:id/subscriptions', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { ...activeSubscription, firstPayment: null } });
    renderPage();
    const card = await openFinanceTab(user);

    await user.click(within(card).getByRole('button', { name: 'Atribuir plano' }));
    const dialog = screen.getByRole('dialog', { name: 'Atribuir plano' });
    expect(within(dialog).getByRole('radio', { name: /Acompanhamento Nutricional/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(within(dialog).getByRole('button', { name: 'Atribuir plano' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(ASSIGN_URL, expect.objectContaining({ planId: 'plan-nutri' })));
    expect(showToast).toHaveBeenCalledWith('Plano atribuído. Primeira cobrança: —.', 'success');
  });

  it('closes the assign sheet without a request on Cancelar', async () => {
    const user = userEvent.setup();
    renderPage();
    const card = await openFinanceTab(user);
    await user.click(within(card).getByRole('button', { name: 'Atribuir plano' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Atribuir plano' })).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Atribuir plano' })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  describe('with an active subscription', () => {
    beforeEach(() => mockApi({ subscription: activeSubscription, payments: [overduePayment({ subscriptionId: 'sub-1', plan: { id: 'plan-nutri', name: 'Acompanhamento Nutricional', recurrence: 'monthly' } })] }));

    it('replaces the plan with a single assignment, without cancelling first', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: 'sub-2', planId: 'plan-n2', firstPayment: null } });
      renderPage();
      const card = await openFinanceTab(user);

      await user.click(within(card).getByRole('button', { name: 'Ações da assinatura' }));
      await user.click(screen.getByRole('button', { name: 'Trocar plano' }));
      const dialog = screen.getByRole('dialog', { name: 'Trocar plano' });
      await user.click(within(dialog).getByRole('radio', { name: /Nutri Trimestral/ }));
      await user.click(within(dialog).getByRole('button', { name: 'Trocar plano' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Plano trocado. Primeira cobrança: —.', 'success'));
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith(ASSIGN_URL, expect.objectContaining({ planId: 'plan-n2' }));
    });

    it('cancels the subscription after confirmation, and keeps it when dismissed', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: {} });
      renderPage();
      const card = await openFinanceTab(user);

      await user.click(within(card).getByRole('button', { name: 'Ações da assinatura' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
      expect(screen.getByRole('alertdialog')).toHaveTextContent('Cancelar a assinatura de Luiza Andrade?');
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Voltar' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();

      await user.click(within(card).getByRole('button', { name: 'Ações da assinatura' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar assinatura' }));
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/professional/subscriptions/sub-1/cancel', {}));
      expect(showToast).toHaveBeenCalledWith('Assinatura cancelada.', 'success');
    });

    it('opens the payment history at /financeiro/alunos/:patientId', async () => {
      const user = userEvent.setup();
      renderPage();
      const card = await openFinanceTab(user);

      await user.click(within(card).getByRole('button', { name: 'Ações da assinatura' }));
      await user.click(screen.getByRole('button', { name: 'Ver histórico' }));
      expect(await screen.findByLabelText('location')).toHaveTextContent(`/financeiro/alunos/${PATIENT_ID}`);
    });

    it('marks an open charge paid through /professional/payments/:id/mark-paid', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: {} });
      renderPage();
      const card = await openFinanceTab(user);

      await user.click(within(card).getByRole('button', { name: /^Marcar pago: cobrança de/ }));
      expect(api.post).toHaveBeenCalledWith('/professional/payments/pay-overdue/mark-paid', {});
    });
  });
});
