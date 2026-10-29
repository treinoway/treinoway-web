import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import PropTypes from 'prop-types';
import ExerciseDrawer from './ExerciseDrawer';

vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const PRINCIPAL = { id: 'p-1', name: 'Rosca' };
const SUBSTITUTE = { id: 's-1', name: 'Rosca martelo', type: 'strength' };

const baseProps = {
  exerciseTemplates: [], saving: false, onCreate: vi.fn(), onEdit: vi.fn(), onImport: vi.fn(), onAddFromTemplate: vi.fn(),
};

// Screen stand-in: the opener lives in the page, the drawer unmounts on close (the opener is re-rendered, not the same node).
const Host = ({ exercise }) => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div data-exercise-id="p-1"><button className="row-menu-trigger">Menu do exercício</button></div>
      <div data-substitute-id="s-1"><button className="substitute-row-edit">Editar substituto Rosca martelo</button></div>
      {open && <ExerciseDrawer {...baseProps} principal={PRINCIPAL} exercise={exercise} onClose={() => setOpen(false)} />}
    </>
  );
};

Host.propTypes = { exercise: PropTypes.object };

describe('ExerciseDrawer — substitute focus return', () => {
  it('returns focus to the principal row menu trigger after adding a substitute', async () => {
    const user = userEvent.setup();
    render(<Host exercise={null} />);

    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: 'Menu do exercício' })).toHaveFocus();
  });

  it('returns focus to the substitute row after editing one', async () => {
    const user = userEvent.setup();
    render(<Host exercise={SUBSTITUTE} />);

    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: 'Editar substituto Rosca martelo' })).toHaveFocus();
  });
});
