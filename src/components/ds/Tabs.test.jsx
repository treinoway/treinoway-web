import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import Tabs from './Tabs';

const TABS = [
  { id: 'all', label: 'Todos', count: 5 },
  { id: 'active', label: 'Ativos', count: 2 },
  { id: 'scheduled', label: 'Agendados', count: 1 },
];

// Controlled host so a key press shows up as the newly selected tab.
const Host = () => {
  const [value, setValue] = useState('all');
  return <Tabs ariaLabel="Filtrar campeonatos" tabs={TABS} value={value} onChange={setValue} />;
};

describe('Tabs', () => {
  it('marks the selected tab, shows counts and moves with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Host />);

    expect(screen.getByRole('tablist', { name: 'Filtrar campeonatos' })).toBeInTheDocument();
    const all = screen.getByRole('tab', { name: 'Todos 5' });
    expect(all).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Ativos 2' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Agendados 1' })).toHaveAttribute('aria-selected', 'false');

    all.focus();
    await user.keyboard('{ArrowRight}');
    const active = screen.getByRole('tab', { name: 'Ativos 2' });
    expect(active).toHaveAttribute('aria-selected', 'true');
    expect(active).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Todos 5' })).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    const scheduled = screen.getByRole('tab', { name: 'Agendados 1' });
    expect(scheduled).toHaveAttribute('aria-selected', 'true');
    expect(scheduled).toHaveFocus();

    await user.click(screen.getByRole('tab', { name: 'Todos 5' }));
    expect(screen.getByRole('tab', { name: 'Todos 5' })).toHaveAttribute('aria-selected', 'true');
  });
});
