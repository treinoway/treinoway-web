import userEvent from '@testing-library/user-event';
import { render, screen } from '../test/test-utils';
import NumberStepper from './NumberStepper';

describe('NumberStepper', () => {
  it('renders the label and current value', () => {
    render(<NumberStepper label="Séries" value={4} onChange={() => {}} min={1} max={10} />);

    expect(screen.getByLabelText('Séries')).toHaveValue(4);
  });

  it('increments on plus button click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberStepper label="Séries" value={4} onChange={onChange} min={1} max={10} />);

    await user.click(screen.getByRole('button', { name: /aumentar séries/i }));

    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('decrements on minus button click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberStepper label="Séries" value={4} onChange={onChange} min={1} max={10} />);

    await user.click(screen.getByRole('button', { name: /diminuir séries/i }));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('disables minus at min boundary', () => {
    render(<NumberStepper label="Séries" value={1} onChange={() => {}} min={1} max={10} />);

    expect(screen.getByRole('button', { name: /diminuir séries/i })).toBeDisabled();
  });

  it('disables plus at max boundary', () => {
    render(<NumberStepper label="Séries" value={10} onChange={() => {}} min={1} max={10} />);

    expect(screen.getByRole('button', { name: /aumentar séries/i })).toBeDisabled();
  });

  it('clamps value to max when typing above max and blurring', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NumberStepper label="Séries" value={5} onChange={onChange} min={1} max={10} />);

    const input = screen.getByLabelText('Séries');
    await user.clear(input);
    await user.type(input, '50');
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(10);
  });

  it('renders the unit suffix', () => {
    render(<NumberStepper label="Descanso" value={60} onChange={() => {}} min={0} unit="s" />);

    expect(screen.getByText('s')).toBeInTheDocument();
  });

  it('disables controls when disabled prop is true', () => {
    render(<NumberStepper label="Séries" value={4} onChange={() => {}} min={1} max={10} disabled />);

    expect(screen.getByRole('button', { name: /aumentar séries/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /diminuir séries/i })).toBeDisabled();
    expect(screen.getByLabelText('Séries')).toBeDisabled();
  });
});
