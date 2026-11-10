import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import AdjustTargetModal from './AdjustTargetModal';

const TARGETS = [
  { pillar: 'workouts', expected: 4 },
  { pillar: 'cardio', expected: 3 },
];

// Renders the modal with spies for submit and close
const renderModal = (props = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<AdjustTargetModal targets={TARGETS} onSubmit={onSubmit} onClose={onClose} {...props} />);
  return { onSubmit, onClose };
};

describe('AdjustTargetModal', () => {
  it('PAN-33 shows the target of the current week for each pillar', async () => {
    const user = userEvent.setup();
    renderModal({ studentName: 'João V.' });

    expect(screen.getByRole('dialog', { name: 'Ajustar meta' })).toBeInTheDocument();
    expect(screen.getByText('João V.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Pilar' })).toHaveValue('workouts');
    expect(screen.getByText('Meta da semana: 4')).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Pilar' }), 'cardio');
    expect(screen.getByText('Meta da semana: 3')).toBeInTheDocument();
  });

  it('PAN-33 offers Treinos and Cardio when the targets are not known', () => {
    renderModal({ targets: undefined });

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Treinos', 'Cardio']);
    expect(screen.queryByText(/Meta da semana:/)).not.toBeInTheDocument();
  });

  it('PAN-33 saves the new value of the chosen pillar, zero included', async () => {
    const user = userEvent.setup();
    const { onSubmit, onClose } = renderModal();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Pilar' }), 'cardio');
    await user.type(screen.getByRole('spinbutton', { name: 'Nova meta' }), '0');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ pillar: 'cardio', value: 0 }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('PAN-33 only enables Salvar once a value is typed', async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    await user.type(screen.getByRole('spinbutton', { name: 'Nova meta' }), '2');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });

  it('PAN-34 shows the API message, keeps the value and stays open when the adjustment is refused', async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error('conflito'), { userMessage: 'A meta só pode ser reduzida na semana em andamento, de zero até a meta original.' });
    const { onClose } = renderModal({ onSubmit: vi.fn().mockRejectedValue(error) });

    await user.type(screen.getByRole('spinbutton', { name: 'Nova meta' }), '9');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A meta só pode ser reduzida na semana em andamento, de zero até a meta original.');
    expect(screen.getByRole('spinbutton', { name: 'Nova meta' })).toHaveValue(9);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });

  it('PAN-33 cancels without saving', async () => {
    const user = userEvent.setup();
    const { onSubmit, onClose } = renderModal();

    await user.type(screen.getByRole('spinbutton', { name: 'Nova meta' }), '2');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the loading label and disables the buttons while the adjustment is saved', async () => {
    const user = userEvent.setup();
    let finish;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    const { onClose } = renderModal({ onSubmit: vi.fn().mockReturnValue(pending) });

    await user.type(screen.getByRole('spinbutton', { name: 'Nova meta' }), '2');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('button', { name: 'Carregando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    finish();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
