import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import SwapExerciseSheet from './SwapExerciseSheet';

const buildSubstitutes = () => [
  { id: 's1', name: 'Cadeira extensora', substituteOrder: 1 },
  { id: 's2', name: 'Leg press', substituteOrder: 0 },
];

describe('SwapExerciseSheet', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <SwapExerciseSheet
        open={false}
        principalName="Agachamento"
        substitutes={buildSubstitutes()}
        onSwap={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title with the principal exercise name and lists substitutes', () => {
    render(
      <SwapExerciseSheet
        open
        principalName="Agachamento"
        substitutes={buildSubstitutes()}
        onSwap={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Trocar Agachamento por:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trocar por Leg press' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Trocar por Cadeira extensora' })
    ).toBeInTheDocument();
  });

  it('orders substitutes by substituteOrder ascending', () => {
    render(
      <SwapExerciseSheet
        open
        principalName="Agachamento"
        substitutes={buildSubstitutes()}
        onSwap={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const buttons = screen
      .getAllByRole('button')
      .filter((btn) => btn.classList.contains('swap-substitute-row'));
    expect(buttons[0]).toHaveAccessibleName('Trocar por Leg press');
    expect(buttons[1]).toHaveAccessibleName('Trocar por Cadeira extensora');
  });

  it('invokes onSwap and shows the spinner on the pending row', async () => {
    const user = userEvent.setup();
    let resolveSwap;
    const onSwap = vi.fn(
      () => new Promise((resolve) => { resolveSwap = resolve; })
    );
    render(
      <SwapExerciseSheet
        open
        principalName="Agachamento"
        substitutes={buildSubstitutes()}
        onSwap={onSwap}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Trocar por Leg press' }));
    expect(onSwap).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's2', name: 'Leg press' })
    );
    // Spinner appears on the pending row.
    expect(screen.getByLabelText('Trocando…')).toBeInTheDocument();

    resolveSwap();
    await waitFor(() => {
      expect(screen.queryByLabelText('Trocando…')).not.toBeInTheDocument();
    });
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SwapExerciseSheet
        open
        principalName="Agachamento"
        substitutes={buildSubstitutes()}
        onSwap={vi.fn()}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Fechar troca' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close while a swap is pending', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSwap = vi.fn(() => new Promise(() => {}));
    render(
      <SwapExerciseSheet
        open
        principalName="Agachamento"
        substitutes={buildSubstitutes()}
        onSwap={onSwap}
        onClose={onClose}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Trocar por Leg press' }));
    await user.click(screen.getByRole('button', { name: 'Fechar troca' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
