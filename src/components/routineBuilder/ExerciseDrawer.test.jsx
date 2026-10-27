import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../ds/ConfirmDialog';
import ExerciseDrawer from './ExerciseDrawer';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const EXERCISE = { id: 'ex-1', name: 'Supino reto', type: 'strength', sets: 3, repetitions: { min: 8, max: 12 } };

const baseProps = {
  exerciseTemplates: [],
  saving: false,
  onCreate: vi.fn(),
  onEdit: vi.fn(),
  onImport: vi.fn(),
  onClose: vi.fn(),
};

// Host that mimics the screen: the drawer's "Excluir" opens a confirm dialog stacked above it.
const DrawerWithDeleteConfirm = (props) => {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <ExerciseDrawer {...baseProps} {...props} onRequestDelete={() => setConfirming(true)} />
      {confirming && (
        <ConfirmDialog message="Excluir exercício?" onConfirm={vi.fn()} onCancel={() => setConfirming(false)} />
      )}
    </>
  );
};

describe('ExerciseDrawer — stacked dialogs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Esc on the delete confirmation closes only the confirmation, not the drawer', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DrawerWithDeleteConfirm exercise={EXERCISE} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Editar exercício' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Esc on the prescription warning closes only the warning, without the discard prompt', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ExerciseDrawer {...baseProps} exercise={null} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Novo exercício' });
    await user.click(within(dialog).getByRole('tab', { name: /Criar novo/i }));
    await user.type(within(dialog).getByLabelText(/Nome/i), 'Leg press');
    await user.click(within(dialog).getByRole('button', { name: /Salvar exercício/i }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog', { name: 'Descartar alterações?' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Esc asks to discard again once the stacked dialog is gone and focus is back in the drawer', async () => {
    const user = userEvent.setup();
    render(<DrawerWithDeleteConfirm exercise={EXERCISE} />);
    await user.type(screen.getByLabelText(/Nome/i), ' X');
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.keyboard('{Escape}');

    await user.keyboard('{Escape}');

    expect(await screen.findByRole('alertdialog', { name: 'Descartar alterações?' })).toBeInTheDocument();
  });
});

describe('ExerciseDrawer — busy while saving', () => {
  it('ignores Esc, the close button and the scrim while saving', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ExerciseDrawer {...baseProps} exercise={EXERCISE} saving onClose={onClose} />);

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('dialog').parentElement);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
  });
});
