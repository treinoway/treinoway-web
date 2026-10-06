import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import PaymentStatusBadge from './PaymentStatusBadge';

describe('PaymentStatusBadge', () => {
  it.each([
    ['pending', 'Pendente'],
    ['paid', 'Paga'],
    ['cancelled', 'Anulada'],
    ['overdue', 'Atrasada'],
  ])('uses the feminine label for %s', (status, label) => {
    render(<PaymentStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('appends the API days overdue with plural', () => {
    const { rerender } = render(<PaymentStatusBadge status="overdue" daysOverdue={1} />);
    expect(screen.getByText('Atrasada · 1 dia')).toBeInTheDocument();
    rerender(<PaymentStatusBadge status="overdue" daysOverdue={4} />);
    expect(screen.getByText('Atrasada · 4 dias')).toBeInTheDocument();
  });
});
