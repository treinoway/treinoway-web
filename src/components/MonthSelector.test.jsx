import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import MonthSelector from './MonthSelector';

describe('MonthSelector', () => {
  it('renders the formatted month label', () => {
    render(<MonthSelector value="2026-05" onChange={vi.fn()} />);
    expect(screen.getByText('Maio de 2026')).toBeInTheDocument();
  });

  it('calls onChange with previous month', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthSelector value="2026-01" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(onChange).toHaveBeenCalledWith('2025-12');
  });

  it('calls onChange with next month', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthSelector value="2026-12" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(onChange).toHaveBeenCalledWith('2027-01');
  });
});
