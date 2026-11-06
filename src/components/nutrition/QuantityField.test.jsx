import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import QuantityField from './QuantityField';

const ERROR_TEXT = 'Informe uma quantidade maior que zero.';
const item = { id: 'item-1', name: 'Arroz Branco', unit: 'g' };

// Test helper: renders the field with sensible defaults.
const renderField = (props = {}) => render(
  <QuantityField item={item} quantityText="100" onQuantityChange={vi.fn()} {...props} />,
);

describe('QuantityField', () => {
  it('renders a labelled spinbutton with the value and unit', () => {
    renderField();

    const input = screen.getByRole('spinbutton', { name: 'Quantidade de arroz branco' });
    expect(input).toHaveValue(100);
    expect(screen.getByText('g')).toBeInTheDocument();
  });

  it('calls the change callback with the item id and the typed raw value', async () => {
    const user = userEvent.setup();
    const onQuantityChange = vi.fn();
    renderField({ quantityText: '', onQuantityChange });

    await user.type(screen.getByRole('spinbutton'), '5');

    expect(onQuantityChange).toHaveBeenCalledWith('item-1', '5');
  });

  it.each(['', '0'])('shows the error wired to the input when the value is "%s"', (quantityText) => {
    renderField({ quantityText });

    const input = screen.getByRole('spinbutton');
    const error = screen.getByText(ERROR_TEXT);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });

  it('shows no error for a valid value', () => {
    renderField({ quantityText: '150' });

    const input = screen.getByRole('spinbutton');
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });
});
