import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import StatusPill from './StatusPill';
import { PAYMENT_STATUS } from '../utils/subscriptionHelpers';

describe('StatusPill', () => {
  it('renders the default label for paid status', () => {
    render(<StatusPill status={PAYMENT_STATUS.PAID} />);
    expect(screen.getByText('Pago')).toBeInTheDocument();
  });

  it('renders the default label for overdue status', () => {
    render(<StatusPill status={PAYMENT_STATUS.OVERDUE} />);
    expect(screen.getByText('Atrasado')).toBeInTheDocument();
  });

  it('uses the provided label when set', () => {
    render(<StatusPill status={PAYMENT_STATUS.PENDING} label="Aguardando" />);
    expect(screen.getByText('Aguardando')).toBeInTheDocument();
  });
});
