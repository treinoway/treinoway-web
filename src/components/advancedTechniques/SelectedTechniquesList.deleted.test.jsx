import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import SelectedTechniquesList from './SelectedTechniquesList';
import { DROP_SET, REST_PAUSE } from '../../test/advancedTechniqueFixtures';

const DELETED = { ...REST_PAUSE, isDeleted: true };

describe('SelectedTechniquesList — soft-deleted technique', () => {
  it('flags a deleted technique with the Excluída badge and an explanatory hint', () => {
    render(<SelectedTechniquesList value={[DROP_SET, DELETED]} onChange={vi.fn()} />);

    expect(screen.getAllByText('Excluída')).toHaveLength(1);
    expect(screen.getAllByText(/será removida ao salvar/i)).toHaveLength(1);
  });

  it('shows no badge for live techniques', () => {
    render(<SelectedTechniquesList value={[DROP_SET, { ...REST_PAUSE, isDeleted: false }]} onChange={vi.fn()} />);

    expect(screen.queryByText('Excluída')).not.toBeInTheDocument();
  });

  it('still allows removing and reordering a deleted technique', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SelectedTechniquesList value={[DROP_SET, DELETED]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Mover Rest-pause para cima' }));
    expect(onChange).toHaveBeenLastCalledWith([DELETED, DROP_SET]);
    await user.click(screen.getByRole('button', { name: 'Remover Rest-pause' }));
    expect(onChange).toHaveBeenLastCalledWith([DROP_SET]);
  });
});
