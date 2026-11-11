import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import PauseWeekModal from './PauseWeekModal';

const CURRENT_WEEK = '2026-11-09';

// Renders the modal with spies for submit and close
const renderModal = (props = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<PauseWeekModal currentWeekStart={CURRENT_WEEK} onSubmit={onSubmit} onClose={onClose} {...props} />);
  return { onSubmit, onClose };
};

describe('PauseWeekModal', () => {
  it('PAN-29 asks for the week, from the current one up to 12 ahead, and an optional reason', () => {
    renderModal({ studentName: 'Marcos P.' });

    expect(screen.getByRole('dialog', { name: 'Pausar semana' })).toBeInTheDocument();
    expect(screen.getByText('Marcos P.')).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(13);
    expect(options[0]).toHaveTextContent('Esta semana · 09/11 a 15/11');
    expect(options[1]).toHaveTextContent('16/11 a 22/11');
    expect(options[12]).toHaveTextContent('01/02 a 07/02');
    expect(screen.getByRole('combobox', { name: 'Semana' })).toHaveValue(CURRENT_WEEK);
    expect(screen.getByRole('textbox', { name: 'Motivo (opcional)' })).toHaveValue('');
  });

  it('PAN-29 pauses the chosen week with the reason on confirm', async () => {
    const user = userEvent.setup();
    const { onSubmit, onClose } = renderModal();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Semana' }), '2026-11-23');
    await user.type(screen.getByRole('textbox', { name: 'Motivo (opcional)' }), 'viagem');
    await user.click(screen.getByRole('button', { name: 'Pausar semana' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ weekStart: '2026-11-23', reason: 'viagem' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('PAN-29 pauses the current week without a reason by default', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Pausar semana' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ weekStart: CURRENT_WEEK, reason: undefined }));
  });

  it('PAN-29 limits the reason to 40 characters', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();
    const field = screen.getByRole('textbox', { name: 'Motivo (opcional)' });

    await user.type(field, 'x'.repeat(45));

    expect(field).toHaveValue('x'.repeat(40));
    expect(screen.getByText('40/40')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pausar semana' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ weekStart: CURRENT_WEEK, reason: 'x'.repeat(40) }));
  });

  it('PAN-30 pauses the whole team with the team wording', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal({ scope: 'team' });

    expect(screen.getByRole('dialog', { name: 'Pausar semana do time' })).toBeInTheDocument();
    expect(screen.getByText('Pausa a semana de todos os alunos ativos.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Motivo (opcional)' }), 'feriado');
    await user.click(screen.getByRole('button', { name: 'Pausar semana do time' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ weekStart: CURRENT_WEEK, reason: 'feriado' }));
  });

  it('PAN-29 cancels without pausing', async () => {
    const user = userEvent.setup();
    const { onSubmit, onClose } = renderModal();

    await user.type(screen.getByRole('textbox', { name: 'Motivo (opcional)' }), 'viagem');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the modal open and shows the API error when the pause is refused', async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error('conflito'), { userMessage: 'Essa semana já fechou.' });
    const { onClose } = renderModal({ onSubmit: vi.fn().mockRejectedValue(error) });

    await user.click(screen.getByRole('button', { name: 'Pausar semana' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Essa semana já fechou.');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pausar semana' })).toBeEnabled();
  });

  it('disables the buttons and shows the loading label while the pause is saved', async () => {
    const user = userEvent.setup();
    let finish;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const { onClose } = renderModal({ onSubmit: vi.fn().mockReturnValue(pending) });

    await user.click(screen.getByRole('button', { name: 'Pausar semana' }));

    expect(await screen.findByRole('button', { name: 'Carregando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    finish();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
