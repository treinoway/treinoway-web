import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import SegmentedChoice from './SegmentedChoice';

const ITEMS = [{ id: 'a', label: 'Editor' }, { id: 'b', label: 'Prescrição detalhada' }];

describe('SegmentedChoice', () => {
  it('marks the selected item', () => {
    render(<SegmentedChoice ariaLabel="Visualização do plano" items={ITEMS} value="a" onChange={vi.fn()} />);
    expect(screen.getByRole('tablist', { name: 'Visualização do plano' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Editor' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Prescrição detalhada' })).toHaveAttribute('aria-selected', 'false');
  });

  it('reports the clicked item', async () => {
    const onChange = vi.fn();
    render(<SegmentedChoice ariaLabel="x" items={ITEMS} value="a" onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Prescrição detalhada' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
