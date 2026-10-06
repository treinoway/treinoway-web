import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import MonthSelector from './MonthSelector';

describe('MonthSelector', () => {
  it('renders the month label in a polite live region', () => {
    render(<MonthSelector value="2026-10" onChange={vi.fn()} />);
    expect(screen.getByText('outubro de 2026')).toHaveAttribute('aria-live', 'polite');
  });

  it('moves to the previous and next month (across years)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthSelector value="2026-01" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(onChange).toHaveBeenLastCalledWith('2025-12');
    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-02');
  });

  it('blocks future months at max', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthSelector value="2026-10" max="2026-10" onChange={onChange} />);

    const next = screen.getByRole('button', { name: 'Próximo mês' });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(next).toHaveAttribute('title', 'Meses futuros não estão disponíveis');
    await user.click(next);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables both arrows while loading', () => {
    render(<MonthSelector value="2026-09" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
  });
});
