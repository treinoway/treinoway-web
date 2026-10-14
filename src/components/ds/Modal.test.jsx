import { useState } from 'react';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

describe('Modal', () => {
  it('renders an accessible dialog with title, body and footer', () => {
    render(
      <Modal title="Vincular aluno" onClose={vi.fn()} footer={<button type="button">Salvar</button>}>
        <p>Conteúdo</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: 'Vincular aluno' })).toBeInTheDocument();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('closes via the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal title="Título" onClose={onClose}>x</Modal>);
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal title="Título" onClose={onClose}>x</Modal>);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the scrim but not the dialog', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal title="Título" onClose={onClose}>corpo</Modal>);
    await user.click(screen.getByText('corpo'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('dialog').parentElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Tab focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(
      <Modal title="Título" onClose={vi.fn()} footer={<button type="button">Último</button>}>
        <input aria-label="Campo" />
      </Modal>
    );
    screen.getByRole('button', { name: 'Último' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  });

  it('restores focus to the trigger on unmount', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(<Modal title="Título" onClose={vi.fn()}>x</Modal>);
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});

describe('Modal eyebrow and close options', () => {
  it('renders an eyebrow and a custom close label, and can disable closing', () => {
    render(<Modal title="Título" eyebrow="Rotina · Novo treino" closeLabel="Fechar resumo" closeDisabled onClose={vi.fn()}>x</Modal>);
    expect(screen.getByText('Rotina · Novo treino')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar resumo' })).toBeDisabled();
  });
});

describe('Modal focus stability', () => {
  it('does not steal focus from an input when the parent re-renders with a new onClose', async () => {
    const user = userEvent.setup();
    const Host = () => {
      const [value, setValue] = useState('');
      return (
        <Modal title="Título" onClose={() => setValue('')}>
          <input aria-label="Campo" value={value} onChange={(e) => setValue(e.target.value)} />
        </Modal>
      );
    };
    render(<Host />);
    await user.type(screen.getByLabelText('Campo'), 'abc');
    expect(screen.getByLabelText('Campo')).toHaveValue('abc');
    expect(screen.getByLabelText('Campo')).toHaveFocus();
  });
});
