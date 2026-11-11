import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import Drawer from './Drawer';

// why: contract for the scroll body: children live in role="region" named by the title; the footer is a sibling inside the dialog, never inside that region.
const getBody = (title) => screen.getByRole('region', { name: title });

describe('Drawer', () => {
  it('renders a modal dialog named by its title with children and footer', () => {
    render(
      <Drawer title="Novo exercício" onClose={vi.fn()} footer={<button type="button">Salvar</button>}>
        <p>Conteúdo</p>
      </Drawer>
    );
    const dialog = screen.getByRole('dialog', { name: 'Novo exercício' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('Conteúdo')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('widens the side panel only when asked for the wide width', () => {
    const { rerender } = render(<Drawer title="Painel" onClose={vi.fn()}>x</Drawer>);
    const overlay = () => screen.getByRole('dialog', { name: 'Painel' }).parentElement;
    expect(overlay()).toHaveClass('ds-drawer-overlay--default');
    rerender(<Drawer title="Painel" width="wide" onClose={vi.fn()}>x</Drawer>);
    expect(overlay()).toHaveClass('ds-drawer-overlay--wide');
  });

  it('renders the footer outside the scrollable body', () => {
    render(
      <Drawer title="Novo exercício" onClose={vi.fn()} footer={<button type="button">Salvar</button>}>
        <input aria-label="Campo" />
      </Drawer>
    );
    const body = getBody('Novo exercício');
    expect(within(body).getByLabelText('Campo')).toBeInTheDocument();
    expect(within(body).queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('renders without a footer', () => {
    render(<Drawer title="Título" onClose={vi.fn()}>corpo</Drawer>);
    expect(getBody('Título')).toHaveTextContent('corpo');
  });

  it('calls onClose from the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer title="Título" onClose={onClose}>x</Drawer>);
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer title="Título" onClose={onClose}>x</Drawer>);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the scrim but not the dialog content', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer title="Título" onClose={onClose}>corpo</Drawer>);
    await user.click(screen.getByText('corpo'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('dialog').parentElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(
      <Drawer title="Título" onClose={vi.fn()} footer={<button type="button">Último</button>}>
        <input aria-label="Campo" />
      </Drawer>
    );
    screen.getByRole('button', { name: 'Último' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  });

  it('restores focus to the trigger on unmount', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(<Drawer title="Título" onClose={vi.fn()}>x</Drawer>);
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
