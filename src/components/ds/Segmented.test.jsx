import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import Segmented from './Segmented';

const items = [
  { id: 'all', label: 'Todos', count: 4 },
  { id: 'active', label: 'Ativos', count: 2 },
];

describe('Segmented', () => {
  it('marks the active item as selected and shows counts', () => {
    render(<Segmented ariaLabel="Filtrar" items={items} value="active" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Ativos (2)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Todos (4)' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the item id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Segmented ariaLabel="Filtrar" items={items} value="all" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'Ativos (2)' }));
    expect(onChange).toHaveBeenCalledWith('active');
  });

  it('renders items without count', () => {
    render(<Segmented ariaLabel="Modo" items={[{ id: 'a', label: 'Alunos' }]} value="a" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Alunos' })).toBeInTheDocument();
  });
});

describe('Segmented extras', () => {
  it('renders item icons and honors disabled', () => {
    const Icon = (props) => <svg data-testid="seg-icon" {...props} />;
    render(
      <Segmented
        ariaLabel="Modo"
        items={[{ id: 'a', label: 'Repetições', icon: Icon }]}
        value="a"
        onChange={vi.fn()}
        disabled
      />
    );
    expect(screen.getByTestId('seg-icon')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Repetições' })).toBeDisabled();
  });
});
