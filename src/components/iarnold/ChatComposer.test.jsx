import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, fireEvent } from '../../test/test-utils';
import ChatComposer from './ChatComposer';

// Renders the composer with controlled state.
const Harness = ({ onSubmit = vi.fn(), disabled = false, activeStudents }) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);
  return (
    <ChatComposer
      value={value}
      onValueChange={setValue}
      onSubmit={onSubmit}
      disabled={disabled}
      textareaRef={textareaRef}
      activeStudents={activeStudents}
    />
  );
};

Harness.propTypes = {
  onSubmit: PropTypes.func,
  disabled: PropTypes.bool,
  activeStudents: PropTypes.number,
};

// Returns the message textbox.
const box = () => screen.getByRole('textbox', { name: 'Mensagem para o assistente' });

describe('ChatComposer', () => {
  it('keeps the send button disabled until there is text', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();

    await user.type(box(), 'Olá');

    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeEnabled();
  });

  it('submits on Enter and not on Shift+Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(box(), 'a{Shift>}{Enter}{/Shift}b');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(box(), '{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('ignores Enter while an IME composition is active', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await user.type(box(), 'x');

    fireEvent.keyDown(box(), { key: 'Enter', isComposing: true });
    fireEvent.keyDown(box(), { key: 'Enter', keyCode: 229 });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('truncates pasted text to 1000 characters and shows the counter at the limit', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(box());
    await user.paste('a'.repeat(1500));

    expect(box()).toHaveValue('a'.repeat(1000));
    expect(screen.getByText('1000/1000')).toBeInTheDocument();
  });

  it('disables the box and the button while loading', () => {
    render(<Harness disabled />);
    expect(box()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
  });

  it('shows the active context with the student count and the attribution', () => {
    render(<Harness activeStudents={12} />);
    expect(screen.getByText('Contexto ativo: 12 alunos')).toBeInTheDocument();
    expect(screen.getByText('Powered by Claude')).toBeInTheDocument();
  });

  it('shows the context without a count while the briefing is unknown', () => {
    render(<Harness />);
    expect(screen.getByText('Contexto ativo')).toBeInTheDocument();
  });

  describe('unfilled placeholders', () => {
    it('blocks the button and Enter, and explains why through aria-describedby', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<Harness onSubmit={onSubmit} />);

      await user.type(box(), 'Aplique {{nome da rotina}');
      await user.keyboard('{Enter}');

      expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Preencha os campos entre chaves antes de enviar')).toBeInTheDocument();
      expect(box()).toHaveAccessibleDescription('Preencha os campos entre chaves antes de enviar');
    });

    it('shows the hint in the composer footer, next to the send button', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.type(box(), 'Olá {{nome}');

      const footer = screen.getByRole('button', { name: 'Enviar mensagem' }).parentElement;
      expect(footer).toContainElement(screen.getByText('Preencha os campos entre chaves antes de enviar'));
    });

    it('sends normally once the placeholder is replaced', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<Harness onSubmit={onSubmit} />);

      await user.type(box(), 'Olá {{nome}');
      await user.clear(box());
      await user.type(box(), 'Olá Ana');
      await user.keyboard('{Enter}');

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Preencha os campos entre chaves antes de enviar')).not.toBeInTheDocument();
    });

    it('does not block ordinary text with braces', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.type(box(), 'use {{} e }}');

      expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeEnabled();
    });
  });
});
