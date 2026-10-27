import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import SelectedTechniquesList from './SelectedTechniquesList';
import { DROP_SET, REST_PAUSE, CLUSTER_SET } from '../../test/advancedTechniqueFixtures';

const VALUE = [DROP_SET, REST_PAUSE, CLUSTER_SET];

describe('SelectedTechniquesList', () => {
  it('renders one row per technique with a drag handle each', () => {
    render(<SelectedTechniquesList value={VALUE} onChange={vi.fn()} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Arrastar Drop set' })).toBeEnabled();
  });

  it('disables move up on the first row and move down on the last', () => {
    render(<SelectedTechniquesList value={VALUE} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Mover Drop set para cima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover Drop set para baixo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mover Cluster set para baixo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover Cluster set para cima' })).toBeEnabled();
  });

  it('reorders via the down button and removes via the remove button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SelectedTechniquesList value={VALUE} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Mover Drop set para baixo' }));
    expect(onChange).toHaveBeenLastCalledWith([REST_PAUSE, DROP_SET, CLUSTER_SET]);

    await user.click(screen.getByRole('button', { name: 'Remover Rest-pause' }));
    expect(onChange).toHaveBeenLastCalledWith([DROP_SET, CLUSTER_SET]);
  });

  it('disables the drag handle with a single item', () => {
    render(<SelectedTechniquesList value={[DROP_SET]} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Arrastar Drop set' })).toBeDisabled();
  });

  it('disables every action when disabled', () => {
    render(<SelectedTechniquesList value={VALUE} disabled onChange={vi.fn()} />);
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
  });
});
