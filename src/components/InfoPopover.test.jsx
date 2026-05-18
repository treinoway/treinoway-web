import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import InfoPopover from './InfoPopover';

const renderPopover = (overrides = {}) =>
  render(
    <div>
      <InfoPopover
        triggerAriaLabel="Sobre métrica"
        title="Métrica"
        {...overrides}
      >
        <p>Conteúdo de explicação</p>
      </InfoPopover>
      <button type="button">Outro botão</button>
    </div>,
  );

describe('InfoPopover', () => {
  it('renders the trigger button with the given aria-label', () => {
    renderPopover();
    expect(
      screen.getByRole('button', { name: 'Sobre métrica' }),
    ).toBeInTheDocument();
  });

  it('does not render the dialog initially', () => {
    renderPopover();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    renderPopover();
    await user.click(screen.getByRole('button', { name: 'Sobre métrica' }));

    const dialog = screen.getByRole('dialog', { name: 'Métrica' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Conteúdo de explicação');
  });

  it('toggles closed when the trigger is clicked again', async () => {
    const user = userEvent.setup();
    renderPopover();
    const trigger = screen.getByRole('button', { name: 'Sobre métrica' });

    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderPopover();
    const trigger = screen.getByRole('button', { name: 'Sobre métrica' });
    await user.click(trigger);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when clicking outside the popover', async () => {
    const user = userEvent.setup();
    renderPopover();
    await user.click(screen.getByRole('button', { name: 'Sobre métrica' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Outro botão' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sets aria-haspopup="dialog" on the trigger', () => {
    renderPopover();
    expect(
      screen.getByRole('button', { name: 'Sobre métrica' }),
    ).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('reflects open state with aria-expanded', async () => {
    const user = userEvent.setup();
    renderPopover();
    const trigger = screen.getByRole('button', { name: 'Sobre métrica' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
