import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '../../test/test-utils';
import BillingDayField from './BillingDayField';

// Renders the field with defaults and returns the onChange spy.
const renderField = (props = {}) => {
  const onChange = vi.fn();
  render(
    <BillingDayField label="Dia de vencimento" hint="Dica do dia" value="" disabled={false} onChange={onChange} {...props} />,
  );
  return { onChange };
};

describe('BillingDayField', () => {
  it('renders the label, the hint as description and an empty number input', () => {
    renderField();
    const input = screen.getByLabelText('Dia de vencimento');
    expect(input).toHaveValue(null);
    expect(input).toHaveAccessibleDescription('Dica do dia');
    expect(input).not.toBeInvalid();
  });

  it('shows the error and marks the input invalid', () => {
    renderField({ error: 'Informe um dia entre 1 e 31.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um dia entre 1 e 31.');
    expect(screen.getByLabelText('Dia de vencimento')).toBeInvalid();
  });

  it('reports typed text through onChange', async () => {
    const { onChange } = renderField();
    await userEvent.setup().type(screen.getByLabelText('Dia de vencimento'), '7');
    expect(onChange).toHaveBeenCalledWith('7', false);
  });

  it('disables the input', () => {
    renderField({ disabled: true });
    expect(screen.getByLabelText('Dia de vencimento')).toBeDisabled();
  });

  it('reports badInput when the browser flags the typed text as unparseable', () => {
    const { onChange } = renderField();
    const input = screen.getByLabelText('Dia de vencimento');
    Object.defineProperty(input, 'validity', { value: { badInput: true } });
    fireEvent.change(input, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith('5', true);
  });
});
