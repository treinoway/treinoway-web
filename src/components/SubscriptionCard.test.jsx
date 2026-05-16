import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import SubscriptionCard from './SubscriptionCard';

vi.mock('../contexts/ToastContext');
vi.mock('../contexts/AuthContext');

const baseProps = {
  onAssign: vi.fn(),
  onReplace: vi.fn(),
  onCancel: vi.fn(),
  onViewHistory: vi.fn(),
};

const mockSubscription = {
  planName: 'Mensal Premium',
  recurrence: 'monthly',
  recurrenceLabel: 'Mensal',
  price: 250,
};

const mockNextPayment = {
  id: 'pay-1',
  status: 'pending',
  amount: 250,
  dueDate: '2026-06-01',
  cycleStartDate: '2026-05-01',
  cycleEndDate: '2026-05-31',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SubscriptionCard', () => {
  describe('loading state', () => {
    it('renders a skeleton when loading', () => {
      const { container } = render(
        <SubscriptionCard {...baseProps} loading />,
      );
      expect(container.querySelector('.skeleton')).toBeTruthy();
      expect(screen.queryByText('Atribuir plano')).toBeNull();
    });
  });

  describe('empty state (no subscription)', () => {
    it('renders empty state when subscription is null', () => {
      render(<SubscriptionCard {...baseProps} subscription={null} />);
      expect(screen.getByText('Sem assinatura ativa')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Atribuir plano' })).toBeInTheDocument();
    });

    it('calls onAssign when "Atribuir plano" is clicked', async () => {
      const user = userEvent.setup();
      render(<SubscriptionCard {...baseProps} subscription={null} />);
      await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
      expect(baseProps.onAssign).toHaveBeenCalledTimes(1);
    });

    it('does not render plan title in empty state', () => {
      render(<SubscriptionCard {...baseProps} subscription={null} />);
      expect(screen.queryByText('Mensal Premium')).toBeNull();
    });
  });

  describe('active subscription', () => {
    it('renders the eyebrow with ASSINATURA text', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      expect(screen.getByText(/ASSINATURA/)).toBeInTheDocument();
    });

    it('renders the plan title using display font class', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      const title = screen.getByRole('heading', { name: 'Mensal Premium' });
      expect(title).toBeInTheDocument();
      expect(title.classList.contains('subscription-card-title')).toBe(true);
    });

    it('renders meta line with recurrence label and cycle text', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      expect(screen.getByText(/Mensal · cobrança a cada mês/i)).toBeInTheDocument();
    });

    it('renders meta with plural months for quarterly plan', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={{ ...mockSubscription, recurrence: 'quarterly', recurrenceLabel: 'Trimestral' }}
          nextPayment={mockNextPayment}
        />,
      );
      expect(screen.getByText(/Trimestral · cobrança a cada 3 meses/i)).toBeInTheDocument();
    });

    it('renders the value amount separately from the R$ prefix', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      // R$ appears as a separate element
      expect(screen.getByText('R$')).toBeInTheDocument();
      // The integer part of 250,00 — "250" appears in the amount span
      const amountEl = document.querySelector('.subscription-card-value-amount');
      expect(amountEl).toBeTruthy();
      expect(amountEl.textContent).toContain('250');
    });

    it('renders the cycle unit label', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      expect(screen.getByText('/mês')).toBeInTheDocument();
    });

    it('renders a StatusPill when nextPayment is provided', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      // StatusPill renders a span with status text
      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });

    it('does not render StatusPill when nextPayment is absent', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={null}
        />,
      );
      expect(screen.queryByText('Pendente')).toBeNull();
      expect(screen.queryByText('Pago')).toBeNull();
    });
  });

  describe('cycle track', () => {
    it('renders cycle track when nextPayment has cycle dates', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      expect(document.querySelector('.subscription-card-cycle-track')).toBeTruthy();
      expect(document.querySelector('.subscription-card-cycle-bar')).toBeTruthy();
    });

    it('renders cycle label with "Vence" text for pending payment', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      const label = document.querySelector('.subscription-card-cycle-label');
      expect(label).toBeTruthy();
      expect(label.textContent).toMatch(/Vence/i);
    });

    it('renders overdue label when payment is past due', () => {
      const overduePayment = {
        ...mockNextPayment,
        status: 'pending',
        cycleEndDate: '2026-01-01',
        dueDate: '2026-01-01',
      };
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={overduePayment}
        />,
      );
      const label = document.querySelector('.subscription-card-cycle-label');
      expect(label.textContent).toMatch(/Venceu há/i);
    });

    it('applies overdue fill class when status is overdue', () => {
      const overduePayment = {
        ...mockNextPayment,
        status: 'pending',
        cycleEndDate: '2026-01-01',
        dueDate: '2026-01-01',
      };
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={overduePayment}
        />,
      );
      const fill = document.querySelector('.subscription-card-cycle-fill');
      expect(fill.classList.contains('subscription-card-cycle-fill--overdue')).toBe(true);
    });

    it('does not render cycle track when nextPayment is null', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={null}
        />,
      );
      expect(document.querySelector('.subscription-card-cycle-track')).toBeNull();
    });
  });

  describe('status border class', () => {
    it('applies --pending class for pending status', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={{ ...mockNextPayment, status: 'pending' }}
        />,
      );
      const article = document.querySelector('article');
      expect(article.classList.contains('subscription-card--pending')).toBe(true);
    });

    it('applies --paid class for paid status', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={{ ...mockNextPayment, status: 'paid' }}
        />,
      );
      const article = document.querySelector('article');
      expect(article.classList.contains('subscription-card--paid')).toBe(true);
    });

    it('applies --overdue class when cycleEndDate is in the past', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={{
            ...mockNextPayment,
            status: 'pending',
            cycleEndDate: '2026-01-01',
            dueDate: '2026-01-01',
          }}
        />,
      );
      const article = document.querySelector('article');
      expect(article.classList.contains('subscription-card--overdue')).toBe(true);
    });
  });

  describe('actions', () => {
    it('renders "Trocar plano" as primary button', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      const btn = screen.getByRole('button', { name: 'Trocar plano' });
      expect(btn).toBeInTheDocument();
      expect(btn.classList.contains('btn-primary')).toBe(true);
    });

    it('renders "Ver histórico" as secondary button', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      const btn = screen.getByRole('button', { name: 'Ver histórico' });
      expect(btn).toBeInTheDocument();
      expect(btn.classList.contains('btn-secondary')).toBe(true);
    });

    it('calls onReplace when "Trocar plano" is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Trocar plano' }));
      expect(baseProps.onReplace).toHaveBeenCalledTimes(1);
    });

    it('calls onViewHistory when "Ver histórico" is clicked', async () => {
      const user = userEvent.setup();
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'Ver histórico' }));
      expect(baseProps.onViewHistory).toHaveBeenCalledTimes(1);
    });

    it('renders the row menu trigger for cancel action', () => {
      render(
        <SubscriptionCard
          {...baseProps}
          subscription={mockSubscription}
          nextPayment={mockNextPayment}
        />,
      );
      expect(screen.getByRole('button', { name: 'Ações da assinatura' })).toBeInTheDocument();
    });
  });
});
