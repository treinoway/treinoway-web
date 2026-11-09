import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import EditSheetModal from './EditSheetModal';
import { buildSheet } from '../../test/nutritionFixtures';

// Test helper: inline error messages rendered by the form.
const inlineErrors = () => Array.from(document.querySelectorAll('.form-error'));

// Test helper: renders the modal.
const renderModal = (sheet) => {
  const onSubmit = vi.fn();
  render(<EditSheetModal sheet={sheet} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
  return onSubmit;
};

describe('EditSheetModal — invalid submit (fix round)', () => {
  it('shows an inline error for sex, weight and height when all are missing, and does not submit', async () => {
    const user = userEvent.setup();
    const onSubmit = renderModal(buildSheet({ sex: null, weightKg: null, heightCm: null }));

    await user.click(screen.getByRole('button', { name: 'Salvar ficha' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(inlineErrors()).toHaveLength(3);
    inlineErrors().forEach((error) => expect(error).toHaveTextContent(/\S/));
  });

  it('shows only the weight error when weight is zero', async () => {
    const user = userEvent.setup();
    const onSubmit = renderModal(buildSheet());

    await user.clear(screen.getByLabelText('Peso (kg)'));
    await user.type(screen.getByLabelText('Peso (kg)'), '0');
    await user.click(screen.getByRole('button', { name: 'Salvar ficha' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(inlineErrors()).toHaveLength(1);
    expect(screen.getByLabelText('Peso (kg)')).toBeInvalid();
  });

  it('clears the errors and submits once the fields are valid', async () => {
    const user = userEvent.setup();
    const onSubmit = renderModal(buildSheet({ weightKg: null }));

    await user.click(screen.getByRole('button', { name: 'Salvar ficha' }));
    expect(inlineErrors()).toHaveLength(1);

    await user.type(screen.getByLabelText('Peso (kg)'), '70');
    await user.click(screen.getByRole('button', { name: 'Salvar ficha' }));

    expect(inlineErrors()).toHaveLength(0);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 70 }));
  });
});
