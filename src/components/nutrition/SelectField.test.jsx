import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import SelectField from './SelectField';

const OPTIONS = [
  { value: 1.2, label: 'Sedentária' },
  { value: 1.55, label: 'Ativa' },
];

describe('SelectField', () => {
  it('associates the label with the select and lists the options', () => {
    render(<SelectField id="factor" label="Rotina" options={OPTIONS} value={1.2} onChange={() => {}} />);
    const select = screen.getByLabelText('Rotina');
    expect(select).toHaveValue('1.2');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Sedentária', 'Ativa']);
  });

  it('calls onChange with the original option value, not the string', async () => {
    const onChange = vi.fn();
    render(<SelectField id="factor" label="Rotina" options={OPTIONS} value={1.2} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Rotina'), 'Ativa');
    expect(onChange).toHaveBeenCalledWith(1.55);
  });

  it('shows the helper text only when given', () => {
    const { rerender } = render(<SelectField id="o" label="Objetivo" options={OPTIONS} value={1.2} onChange={() => {}} />);
    expect(screen.queryByText('Dica')).not.toBeInTheDocument();
    rerender(<SelectField id="o" label="Objetivo" options={OPTIONS} value={1.2} onChange={() => {}} note="Dica" />);
    expect(screen.getByText('Dica')).toBeInTheDocument();
  });
});
