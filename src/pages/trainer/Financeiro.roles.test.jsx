import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, within } from '../../test/test-utils';
import Financeiro from './Financeiro';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  DUAL_ROLE,
  NUTRITIONIST_ONLY,
  TRAINER_ONLY,
  authAs,
  bothPlan,
  makeKpis,
  makePayment,
  makePlan,
  nutritionPlan,
  overduePayment,
  paidPayment,
  pinFinanceClock,
} from '../../test/financeFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const nutritionRow = makePayment({
  id: 'pay-nutri',
  dueDate: '2026-10-10',
  serviceType: 'nutrition',
  serviceTypeLabel: 'Nutrição',
  student: { id: 'student-2', name: 'João Pereira', avatarUrl: null },
  plan: { id: 'plan-nutri', name: 'Acompanhamento Nutricional', recurrence: 'monthly' },
});

// Test helper: overview payload with a training, a nutrition and a paid charge.
const buildOverview = (overrides = {}) => ({
  month: '2026-10',
  overdueGraceDays: 3,
  kpis: makeKpis(),
  payments: [overduePayment(), nutritionRow, paidPayment()],
  ...overrides,
});

let overviewResponse;
let plansResponse;

// Test helper: answers the overview and plans requests of the /professional/* API.
const mockApi = () => {
  api.get.mockImplementation((url) => {
    if (url === '/professional/finance/overview') return overviewResponse();
    if (url === '/professional/subscription-plans') return plansResponse();
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

// Test helper: renders the page at /financeiro.
const renderPage = (route = '/financeiro') => render(
  <MemoryRouter initialEntries={[route]}>
    <Routes>
      <Route path="/financeiro" element={<Financeiro />} />
    </Routes>
  </MemoryRouter>,
);

// Test helper: card article of a plan, found by its heading.
const planCard = (name) => screen.getByRole('heading', { level: 3, name }).closest('article');

// Test helper: the tag badge of a plan card.
const tagBadgeOf = (name) => planCard(name).querySelector('.badge.badge--tag');

// Test helper: the type filter tab whose label starts with the given text.
const typeTab = (label) => screen.getByRole('tab', { name: new RegExp(`^${label}`) });

describe('Financeiro by professional role', () => {
  beforeEach(() => {
    pinFinanceClock();
    vi.clearAllMocks();
    localStorage.clear();
    useToast.mockReturnValue({ showToast: mockShowToast });
    useAuth.mockReturnValue(authAs(TRAINER_ONLY));
    overviewResponse = () => Promise.resolve({ data: buildOverview() });
    plansResponse = () => Promise.resolve({ data: [makePlan()] });
    mockApi();
  });

  afterEach(() => vi.useRealTimers());

  describe('nutritionist-only user', () => {
    beforeEach(() => useAuth.mockReturnValue(authAs(NUTRITIONIST_ONLY)));

    it('loads /professional/finance/overview and reads "paciente" where trainers read "aluno"', async () => {
      renderPage();
      await screen.findByText('Maria Silva');

      expect(api.get).toHaveBeenCalledWith('/professional/finance/overview', expect.objectContaining({ params: { month: '2026-10' } }));
      const hero = screen.getByRole('region', { name: 'Resumo de outubro de 2026' });
      expect(within(hero).getByText('2 de 15 pacientes')).toBeInTheDocument();
      const search = screen.getByRole('textbox', { name: 'Buscar cobranças por paciente' });
      expect(search).toHaveAttribute('placeholder', 'Buscar paciente…');
      expect(document.body.textContent).not.toMatch(/aluno/i);
      expect(document.body.textContent).not.toMatch(/cliente/i);
    });

    it('says "Nenhum paciente encontrado" when the search has no match', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Maria Silva');
      await user.type(screen.getByRole('textbox', { name: 'Buscar cobranças por paciente' }), 'zzz');
      await screen.findByText('Nenhum paciente encontrado para "zzz".');
    });

    it('names an unnamed person "Paciente sem nome" and links to /financeiro/alunos/:studentId', async () => {
      overviewResponse = () => Promise.resolve({
        data: buildOverview({ payments: [makePayment({ student: { id: 'p-9', name: '', avatarUrl: null } })] }),
      });
      renderPage();
      const link = await screen.findByRole('link', { name: 'Ver histórico de Paciente sem nome' });
      expect(link).toHaveAttribute('href', '/financeiro/alunos/p-9');
    });

    it('shows no type filter and no tag badges', async () => {
      const user = userEvent.setup();
      plansResponse = () => Promise.resolve({ data: [nutritionPlan()] });
      renderPage();
      await screen.findByText('Maria Silva');
      expect(screen.queryByRole('tab', { name: /^Treino/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: /^Nutrição/ })).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Planos' }));
      await screen.findByRole('heading', { level: 3, name: 'Acompanhamento Nutricional' });
      expect(screen.queryByRole('tab', { name: /^Nutrição/ })).not.toBeInTheDocument();
      expect(document.querySelector('.badge--tag')).toBeNull();
    });

    it('counts subscribers as "pacientes" on the plan card', async () => {
      plansResponse = () => Promise.resolve({ data: [nutritionPlan({ activeSubscriptionCount: 4 })] });
      renderPage('/financeiro?tab=plans');
      await screen.findByRole('heading', { level: 3, name: 'Acompanhamento Nutricional' });
      expect(within(planCard('Acompanhamento Nutricional')).getByText('Mensal · 4 pacientes')).toBeInTheDocument();
    });

    it('invites to create the first plan "para atribuir aos pacientes"', async () => {
      plansResponse = () => Promise.resolve({ data: [] });
      renderPage('/financeiro?tab=plans');
      expect(await screen.findByText('Crie o primeiro plano para atribuir aos pacientes.')).toBeInTheDocument();
    });

    it('creates a plan on /professional/subscription-plans without a service type choice or field', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: nutritionPlan({ id: 'plan-new' }) });
      renderPage('/financeiro?tab=plans');
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });

      await user.click(screen.getByRole('button', { name: 'Novo plano' }));
      expect(screen.queryByRole('button', { name: 'Nutrição' })).not.toBeInTheDocument();
      await user.type(screen.getByLabelText('Nome'), 'Mensal');
      await user.type(screen.getByLabelText('Valor por cobrança (R$)'), '200');
      await user.click(screen.getByRole('button', { name: 'Criar plano' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/professional/subscription-plans', expect.objectContaining({ name: 'Mensal' })));
      expect(api.post.mock.calls[0][1]).not.toHaveProperty('serviceType');
    });
  });

  describe('trainer-only user', () => {
    it('keeps the trainer copy and shows no type filter nor tag badges', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Maria Silva');

      expect(within(screen.getByRole('region', { name: 'Resumo de outubro de 2026' })).getByText('2 de 15 alunos')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Buscar cobranças por aluno' })).toHaveAttribute('placeholder', 'Buscar aluno…');
      expect(screen.queryByRole('tab', { name: /^Nutrição/ })).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/paciente|cliente/i);

      await user.click(screen.getByRole('tab', { name: 'Planos' }));
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });
      expect(screen.getByText('Mensal · 4 alunos')).toBeInTheDocument();
      expect(document.querySelector('.badge--tag')).toBeNull();
      expect(document.body.textContent).not.toMatch(/paciente|cliente/i);
    });
  });

  describe('dual-role user', () => {
    beforeEach(() => useAuth.mockReturnValue(authAs(DUAL_ROLE)));

    it('uses noun-free copy: "Buscar por nome" and "Sem nome"', async () => {
      overviewResponse = () => Promise.resolve({
        data: buildOverview({ payments: [overduePayment(), makePayment({ id: 'pay-x', student: { id: 's-x', name: '', avatarUrl: null } })] }),
      });
      renderPage();
      await screen.findByText('Maria Silva');

      expect(screen.getByPlaceholderText('Buscar por nome')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Ver histórico de Sem nome' })).toHaveAttribute('href', '/financeiro/alunos/s-x');
      expect(screen.getByText('Sem nome')).toBeInTheDocument();
      expect(screen.queryByText(/Aluno sem nome|Paciente sem nome/)).not.toBeInTheDocument();
    });

    it('narrows the charges with a Segmented type filter', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Maria Silva');

      const nutritionTab = typeTab('Nutrição');
      const filter = nutritionTab.closest('.segmented');
      expect(filter).toHaveAttribute('role', 'tablist');
      expect(within(filter).getByRole('tab', { name: /^Treino/ })).toBeInTheDocument();
      expect(within(filter).getByRole('tab', { name: /^Ambos/ })).toBeInTheDocument();

      await user.click(nutritionTab);
      expect(typeTab('Nutrição')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('João Pereira')).toBeInTheDocument();
      expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
      expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument();

      await user.click(typeTab('Treino'));
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
      expect(screen.getByText('Ana Costa')).toBeInTheDocument();
      expect(screen.queryByText('João Pereira')).not.toBeInTheDocument();
    });

    it('tags every plan card with a tag Badge and narrows plans with the Segmented type filter', async () => {
      const user = userEvent.setup();
      plansResponse = () => Promise.resolve({ data: [makePlan(), nutritionPlan(), bothPlan()] });
      renderPage('/financeiro?tab=plans');
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });

      expect(api.get).toHaveBeenCalledWith('/professional/subscription-plans', { params: { includeArchived: true } });
      expect(tagBadgeOf('Consultoria Mensal')).toHaveTextContent('Treino');
      expect(tagBadgeOf('Acompanhamento Nutricional')).toHaveTextContent('Nutrição');
      expect(tagBadgeOf('Treino e Dieta')).toHaveTextContent('Ambos');
      expect(tagBadgeOf('Consultoria Mensal')).toHaveClass('badge');

      const nutritionTab = typeTab('Nutrição');
      expect(nutritionTab.closest('.segmented')).toHaveAttribute('role', 'tablist');
      await user.click(nutritionTab);
      expect(screen.getByRole('heading', { level: 3, name: 'Acompanhamento Nutricional' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 3, name: 'Consultoria Mensal' })).not.toBeInTheDocument();

      await user.click(typeTab('Ambos'));
      expect(screen.getByRole('heading', { level: 3, name: 'Treino e Dieta' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 3, name: 'Acompanhamento Nutricional' })).not.toBeInTheDocument();
    });

    it('splits the plan subscriber count by kind ("2 alunos · 1 paciente")', async () => {
      plansResponse = () => Promise.resolve({
        data: [bothPlan({ activeSubscriptionCount: 3, activeSubscriptionCountByKind: { students: 2, patients: 1 } })],
      });
      renderPage('/financeiro?tab=plans');
      await screen.findByRole('heading', { level: 3, name: 'Treino e Dieta' });
      expect(within(planCard('Treino e Dieta')).getByText(/2 alunos · 1 paciente/)).toBeInTheDocument();
    });

    it('creates a plan with the chosen service type', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: nutritionPlan({ id: 'plan-new' }) });
      renderPage('/financeiro?tab=plans');
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });

      await user.click(screen.getByRole('button', { name: 'Novo plano' }));
      const dialog = screen.getByRole('dialog', { name: 'Novo plano' });
      await user.type(within(dialog).getByLabelText('Nome'), 'Dieta');
      await user.type(within(dialog).getByLabelText('Valor por cobrança (R$)'), '180');
      await user.click(within(dialog).getByRole('button', { name: 'Nutrição' }));
      await user.click(within(dialog).getByRole('button', { name: 'Criar plano' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith(
        '/professional/subscription-plans',
        expect.objectContaining({ name: 'Dieta', serviceType: 'nutrition' }),
      ));
    });
  });
});
