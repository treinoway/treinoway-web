import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import DescriptionChipEditor from './DescriptionChipEditor';

const Harness = ({ onSave }) => {  // eslint-disable-line react/prop-types
  const [value, setValue] = useState(null);
  return (
    <>
      <DescriptionChipEditor
        value={value}
        onSave={(next) => {
          onSave(next);
          setValue(next || null);
        }}
      />
      <button type="button">Fora</button>
    </>
  );
};

const openEditor = async (user) => {
  await user.click(screen.getByRole('button', { name: /Definir Descrição/i }));
  return screen.getByRole('textbox', { name: /Descrição da rotina/i });
};

describe('DescriptionChipEditor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('positions the popover through CSS variables, not inline position styles', async () => {
    const user = userEvent.setup();
    render(<Harness onSave={vi.fn()} />);

    await openEditor(user);

    const dialog = screen.getByRole('dialog', { name: /Descrição da rotina/i });
    expect(dialog).not.toHaveAttribute('style', expect.stringMatching(/position|z-index|(^|;\s*)(top|left)\s*:/));
    expect(dialog.style.getPropertyValue('--popover-top')).toMatch(/px$/);
    expect(dialog.style.getPropertyValue('--popover-left')).toMatch(/px$/);
  });

  it('opens a popover with a focused textarea', async () => {
    const user = userEvent.setup();
    render(<Harness onSave={vi.fn()} />);

    const textarea = await openEditor(user);

    expect(textarea).toHaveFocus();
    expect(screen.getByRole('dialog', { name: /Descrição da rotina/i })).toBeInTheDocument();
  });

  it('updates the draft while typing and saves with Salvar', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSave={onSave} />);

    const textarea = await openEditor(user);
    await user.type(textarea, 'Ganho de massa');
    expect(textarea).toHaveValue('Ganho de massa');
    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));

    expect(onSave).toHaveBeenCalledWith('Ganho de massa');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Definir Descrição/i })).toHaveFocus();
  });

  it('closes without saving on Cancelar', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSave={onSave} />);

    await user.type(await openEditor(user), 'rascunho');
    await user.click(screen.getByRole('button', { name: /^Cancelar$/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes without saving on Escape and returns focus to the chip', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSave={onSave} />);

    await openEditor(user);
    await user.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Definir Descrição/i })).toHaveFocus();
  });

  it('saves with Cmd+Enter', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSave={onSave} />);

    await user.type(await openEditor(user), 'Rápida');
    await user.keyboard('{Meta>}{Enter}{/Meta}');

    expect(onSave).toHaveBeenCalledWith('Rápida');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saves with Ctrl+Enter', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSave={onSave} />);

    await user.type(await openEditor(user), 'Outra');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(onSave).toHaveBeenCalledWith('Outra');
  });

  it('closes without saving on outside click', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSave={onSave} />);

    await user.type(await openEditor(user), 'texto');
    await user.click(screen.getByRole('button', { name: 'Fora' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the saved value truncated on the chip and prefills on reopen', async () => {
    const user = userEvent.setup();
    const longText = 'Descrição muito longa para o chip';
    render(<Harness onSave={vi.fn()} />);

    await user.type(await openEditor(user), longText);
    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));

    expect(screen.getByText(`${longText.slice(0, 20)}…`)).toBeInTheDocument();
    expect(await openEditor(user)).toHaveValue(longText);
  });
});
