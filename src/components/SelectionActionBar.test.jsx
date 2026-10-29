import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import SelectionActionBar, { SelectionInstructionStrip } from './SelectionActionBar';

describe('SelectionActionBar', () => {
  it('renders the count and disables the CTA below the minimum (2)', () => {
    render(
      <SelectionActionBar
        selectedCount={1}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText('1 selecionados')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Criar bi-set' })
    ).toBeDisabled();
  });

  it('enables the CTA at exactly 2 selections', () => {
    render(
      <SelectionActionBar
        selectedCount={2}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Criar bi-set' })
    ).toBeEnabled();
  });

  it('keeps the CTA enabled at the upper bound (6)', () => {
    render(
      <SelectionActionBar
        selectedCount={6}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Criar bi-set' })
    ).toBeEnabled();
  });

  it('shows a loading label and disables the CTA when saving', () => {
    render(
      <SelectionActionBar
        selectedCount={3}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        saving
      />
    );
    expect(
      screen.getByRole('button', { name: 'Carregando...' })
    ).toBeDisabled();
  });

  it('calls onCancel when the "Cancelar" button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <SelectionActionBar
        selectedCount={3}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onConfirm when the CTA is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <SelectionActionBar
        selectedCount={3}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Criar bi-set' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe('SelectionInstructionStrip', () => {
  it('renders the long instruction by default', () => {
    render(<SelectionInstructionStrip />);
    expect(
      screen.getByText('Selecione 2 a 6 exercícios. Não precisam estar em sequência.')
    ).toBeInTheDocument();
  });

  it('renders the short instruction when short prop is set', () => {
    render(<SelectionInstructionStrip short />);
    expect(
      screen.getByText('Selecione 2 a 6 exercícios para agrupar em bi-set.')
    ).toBeInTheDocument();
  });
});
