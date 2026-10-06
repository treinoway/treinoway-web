import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '../../test/test-utils';
import PaymentRow from './PaymentRow';
import {
  makePayment,
  overduePayment,
  paidPayment,
  pinFinanceClock,
  voidPayment,
} from '../../test/financeFixtures';

const handlers = () => ({
  onMarkPaid: vi.fn(),
  onMarkPaidOnDate: vi.fn(),
  onEdit: vi.fn(),
  onRevert: vi.fn(),
  onVoid: vi.fn(),
});

const ALL_MENU_ITEMS = [
  'Marcar pago em outra data…',
  'Editar cobrança',
  'Anular cobrança',
  'Voltar para pendente',
  'Registrar pagamento…',
];

/** Menu items present, in DOM order (queried by role + name). */
const menuItemNames = () => ALL_MENU_ITEMS
  .map((name) => screen.queryByRole('button', { name }))
  .filter(Boolean)
  .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
  .map((button) => button.textContent);

/** The overview row links to the history, so it needs a router (kept across rerenders). */
const renderRow = (ui) => render(ui, { wrapper: MemoryRouter });

const openMenu = async (user) => {
  await user.click(screen.getByRole('button', { name: /^Ações da cobrança/ }));
};

describe('PaymentRow', () => {
  beforeEach(pinFinanceClock);
  afterEach(() => vi.useRealTimers());

  describe('overview variant', () => {
    it('shows student, plan, overdue badge with days and the amount', () => {
      renderRow(<PaymentRow payment={overduePayment()} {...handlers()} />);

      const row = screen.getByRole('article');
      expect(within(row).getByText('Maria Silva')).toBeInTheDocument();
      expect(within(row).getByText('Consultoria Mensal')).toBeInTheDocument();
      expect(within(row).getByText('Atrasada · 5 dias')).toBeInTheDocument();
      expect(within(row).getByText('Venceu 01/10')).toBeInTheDocument();
      expect(within(row).getByText(/R\$\s?99,90/)).toBeInTheDocument();
    });

    it('uses "Vence" for a future pending charge and "Venceu" inside the grace window, both PENDENTE', () => {
      const { rerender } = renderRow(<PaymentRow payment={makePayment({ dueDate: '2026-10-10' })} {...handlers()} />);
      expect(screen.getByText('Vence 10/10')).toBeInTheDocument();
      expect(screen.getByText('Pendente')).toBeInTheDocument();

      rerender(<PaymentRow payment={makePayment({ dueDate: '2026-10-04' })} {...handlers()} />);
      expect(screen.getByText('Venceu 04/10')).toBeInTheDocument();
      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });

    it('formats paidAt in São Paulo time (B5): 23:30 BRT on 03/10 stays 03/10', () => {
      renderRow(<PaymentRow payment={paidPayment({ paidAt: '2026-10-04T02:30:00.000Z' })} {...handlers()} />);
      expect(screen.getByText('Paga em 03/10')).toBeInTheDocument();
      expect(screen.getByText('Paga')).toBeInTheDocument();
    });

    it('flags debt from a cancelled plan', () => {
      renderRow(<PaymentRow payment={overduePayment({ subscriptionStatus: 'cancelled' })} {...handlers()} />);
      expect(screen.getByText('Consultoria Mensal · plano cancelado')).toBeInTheDocument();
    });

    it('falls back to "Aluno sem nome" when the API name is empty', () => {
      renderRow(<PaymentRow payment={makePayment({ student: { id: 's', name: '', avatarUrl: null } })} {...handlers()} />);
      expect(screen.getByRole('button', { name: /Marcar pago: Aluno sem nome/ })).toBeInTheDocument();
    });

    it('calls onMarkPaid from the inline button with an accessible label', async () => {
      const user = userEvent.setup();
      const props = handlers();
      const payment = overduePayment();
      renderRow(<PaymentRow payment={payment} {...props} />);

      await user.click(screen.getByRole('button', { name: /Marcar pago: Maria Silva, R\$\s?99,90/ }));
      expect(props.onMarkPaid).toHaveBeenCalledWith(payment);
    });

    it('shows "Carregando..." and disables the button and menu while mutating', () => {
      renderRow(<PaymentRow payment={overduePayment()} isMutating {...handlers()} />);
      expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: /^Ações da cobrança/ })).toBeDisabled();
      expect(screen.getByRole('article')).toHaveAttribute('aria-busy', 'true');
    });

    it('links the avatar + name to the student history with an accessible name', () => {
      renderRow(<PaymentRow payment={overduePayment()} {...handlers()} />);

      const link = screen.getByRole('link', { name: 'Ver histórico de Maria Silva' });
      expect(link).toHaveAttribute('href', '/trainer/students/student-1/subscription-history');
      expect(within(link).getByText('Maria Silva')).toBeInTheDocument();
      expect(within(link).getByText('MS')).toBeInTheDocument();
      expect(within(link).queryByRole('button')).not.toBeInTheDocument();
    });

    it('keeps "Marcar pago" and the menu outside the link (the row itself is not clickable)', () => {
      renderRow(<PaymentRow payment={overduePayment()} {...handlers()} />);

      const link = screen.getByRole('link', { name: 'Ver histórico de Maria Silva' });
      expect(link).not.toContainElement(screen.getByRole('button', { name: /Marcar pago: Maria Silva/ }));
      expect(link).not.toContainElement(screen.getByRole('button', { name: /^Ações da cobrança/ }));
      expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    it('uses the fallback name in the link label when the API name is empty', () => {
      renderRow(<PaymentRow payment={makePayment({ student: { id: 's', name: '', avatarUrl: null } })} {...handlers()} />);
      expect(screen.getByRole('link', { name: 'Ver histórico de Aluno sem nome' }))
        .toHaveAttribute('href', '/trainer/students/s/subscription-history');
    });

    it('renders the identity without a link when the student id is missing', () => {
      renderRow(<PaymentRow payment={makePayment({ student: { name: 'Sem Id', avatarUrl: null } })} {...handlers()} />);
      expect(screen.getByText('Sem Id')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('menu for open charges: date, edit, void (last) — no "Ver histórico"', async () => {
      const user = userEvent.setup();
      const props = handlers();
      renderRow(<PaymentRow payment={overduePayment()} {...props} />);
      await openMenu(user);

      expect(menuItemNames()).toEqual([
        'Marcar pago em outra data…',
        'Editar cobrança',
        'Anular cobrança',
      ]);
      expect(screen.queryByRole('button', { name: /Ver histórico/ })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Anular cobrança' }));
      expect(props.onVoid).toHaveBeenCalled();
    });

    it('opens the menu of an overdue row that is last in a list and reaches "Marcar pago em outra data…"', async () => {
      const user = userEvent.setup();
      const props = handlers();
      const lastPayment = overduePayment({ id: 'pay-last', student: { id: 's2', name: 'João Lima', avatarUrl: null } });
      renderRow(
        <>
          <PaymentRow payment={overduePayment()} {...handlers()} />
          <PaymentRow payment={lastPayment} {...props} />
        </>,
      );

      const lastRow = screen.getAllByRole('article')[1];
      const trigger = within(lastRow).getByRole('button', { name: /^Ações da cobrança de João Lima/ });
      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await user.click(within(lastRow).getByRole('button', { name: 'Marcar pago em outra data…' }));
      expect(props.onMarkPaidOnDate).toHaveBeenCalledWith(lastPayment);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('paid rows have no inline action and never offer "Anular"', async () => {
      const user = userEvent.setup();
      const props = handlers();
      renderRow(<PaymentRow payment={paidPayment()} {...props} />);
      expect(screen.queryByRole('button', { name: /Marcar pago:/ })).not.toBeInTheDocument();

      await openMenu(user);
      expect(menuItemNames()).toEqual(['Editar cobrança', 'Voltar para pendente']);
      expect(screen.queryByRole('button', { name: /Ver histórico/ })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Voltar para pendente' }));
      expect(props.onRevert).toHaveBeenCalled();
    });
  });

  describe('history variant', () => {
    it('uses the cycle period as title, shows notes, has no student link and no "Ver histórico"', async () => {
      const user = userEvent.setup();
      renderRow(
        <PaymentRow
          payment={overduePayment({ notes: 'Pix combinado' })}
          variant="history"
          {...handlers()}
        />,
      );

      expect(screen.getByText('01/10 – 31/10/2026')).toBeInTheDocument();
      expect(screen.getByText('Obs.: Pix combinado')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Marcar pago: cobrança de 01/10' })).toBeInTheDocument();

      expect(screen.queryByRole('link')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Ações da cobrança de 01/10' }));
      expect(screen.queryByRole('button', { name: /Ver histórico/ })).not.toBeInTheDocument();
    });

    it('anulada rows only offer "Registrar pagamento…"', async () => {
      const user = userEvent.setup();
      const props = handlers();
      renderRow(<PaymentRow payment={voidPayment()} variant="history" {...props} />);

      expect(screen.getByText('Anulada')).toBeInTheDocument();
      expect(screen.getByText('Venc. 01/10')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Ações da cobrança de 01/10' }));
      expect(menuItemNames()).toEqual(['Registrar pagamento…']);
      await user.click(screen.getByRole('button', { name: 'Registrar pagamento…' }));
      expect(props.onMarkPaidOnDate).toHaveBeenCalled();
    });
  });
});
