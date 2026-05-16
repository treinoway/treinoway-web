import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import SubscriptionStrip from './SubscriptionStrip';
import { STUB_SUBSCRIPTION } from '../constants/subscriptionStub';

describe('SubscriptionStrip', () => {
  it('renders plan label and value', () => {
    renderWithRouter(<SubscriptionStrip />);
    expect(screen.getByText('Plano')).toBeInTheDocument();
    expect(screen.getByText(STUB_SUBSCRIPTION.planLabel)).toBeInTheDocument();
    expect(screen.getByText(STUB_SUBSCRIPTION.planPrice)).toBeInTheDocument();
  });

  it('renders renewal label and days', () => {
    renderWithRouter(<SubscriptionStrip />);
    expect(screen.getByText('Renova em')).toBeInTheDocument();
    expect(screen.getByText(String(STUB_SUBSCRIPTION.daysToRenewal))).toBeInTheDocument();
    expect(screen.getByText(STUB_SUBSCRIPTION.renewalDate)).toBeInTheDocument();
  });

  it('renders Alterar and Renovar action buttons', () => {
    renderWithRouter(<SubscriptionStrip />);
    expect(screen.getByRole('button', { name: /alterar plano/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /renovar plano/i })).toBeInTheDocument();
  });

  it('does not apply warn class when days > threshold', () => {
    const data = { ...STUB_SUBSCRIPTION, daysToRenewal: 30, warnThresholdDays: 14 };
    renderWithRouter(<SubscriptionStrip data={data} />);
    const chips = document.querySelectorAll('.subscription-chip');
    chips.forEach((chip) => {
      expect(chip.classList.contains('subscription-chip--warn')).toBe(false);
    });
  });

  it('applies warn class to renewal chip when days <= threshold', () => {
    const data = { ...STUB_SUBSCRIPTION, daysToRenewal: 10, warnThresholdDays: 14 };
    renderWithRouter(<SubscriptionStrip data={data} />);
    const warnChips = document.querySelectorAll('.subscription-chip--warn');
    expect(warnChips.length).toBeGreaterThan(0);
  });

  it('applies warn class exactly at the threshold boundary', () => {
    const data = { ...STUB_SUBSCRIPTION, daysToRenewal: 14, warnThresholdDays: 14 };
    renderWithRouter(<SubscriptionStrip data={data} />);
    const warnChips = document.querySelectorAll('.subscription-chip--warn');
    expect(warnChips.length).toBeGreaterThan(0);
  });
});
