import { render, screen, within, fireEvent } from '../../test/test-utils';
import MacroTable from './MacroTable';

const MACROS = {
  protein: { grams: 118.8, kcal: 475, pct: 25 },
  carbs: { grams: 200, kcal: 800, pct: 42.1 },
  fat: { grams: 60, kcal: 540, pct: 28.4 },
};
const GOALS = { proteinPerKg: 1.8, fatPerKg: 0.9, carbIsRemainder: true, fiberMinG: 25 };

// Test helper: renders the table with default data and returns the onChange spy.
const setup = (props = {}) => {
  const onChange = vi.fn();
  render(<MacroTable goals={GOALS} macros={MACROS} carbPerKg={3} onChange={onChange} {...props} />);
  return onChange;
};
// Test helper: the table row whose name starts with the given label.
const row = (name) => screen.getByRole('row', { name: new RegExp(`^${name}`) });

describe('MacroTable', () => {
  it('renders the macro rows with grams, kcal and percentage', () => {
    setup();
    expect(within(row('Proteína')).getByText('118,8')).toBeInTheDocument();
    expect(within(row('Proteína')).getByText('475')).toBeInTheDocument();
    expect(within(row('Proteína')).getByText('25,0%')).toBeInTheDocument();
    expect(within(row('Lipídio')).getByText('60,0')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Fibras mínimo (g)' })).toHaveValue(25);
  });

  it('reports g/kg edits per macro, with null when cleared', () => {
    const onChange = setup({ goals: { ...GOALS, carbIsRemainder: false } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Proteína (g/kg)' }), { target: { value: '2' } });
    expect(onChange).toHaveBeenLastCalledWith({ proteinPerKg: 2 });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Carboidrato (g/kg)' }), { target: { value: '4.5' } });
    expect(onChange).toHaveBeenLastCalledWith({ carbPerKg: 4.5 });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Lipídio (g/kg)' }), { target: { value: '1' } });
    expect(onChange).toHaveBeenLastCalledWith({ fatPerKg: 1 });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Fibras mínimo (g)' }), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ fiberMinG: null });
  });

  it('shows carbs as RESTANTE without an input when it is the remainder', () => {
    setup();
    expect(screen.queryByRole('spinbutton', { name: 'Carboidrato (g/kg)' })).not.toBeInTheDocument();
    expect(within(row('Carboidrato')).getByText('Restante')).toBeInTheDocument();
    expect(within(row('Carboidrato')).getByText('3')).toBeInTheDocument();
  });

  it('shows a dash for the remainder g/kg while unknown', () => {
    setup({ carbPerKg: undefined });
    expect(within(row('Carboidrato')).getAllByText('-').length).toBeGreaterThan(0);
  });

  it('shows dashes for grams and share without macros', () => {
    setup({ macros: null });
    expect(within(row('Proteína')).getAllByText('-').length).toBeGreaterThanOrEqual(3);
  });

  it('marks kcal and %VET columns as desktop-only', () => {
    setup();
    expect(screen.getByRole('columnheader', { name: 'kcal' })).toHaveClass('table-col-desktop-only');
    expect(screen.getByRole('columnheader', { name: '% VET' })).toHaveClass('table-col-desktop-only');
    expect(screen.getByRole('columnheader', { name: 'g/dia' })).not.toHaveClass('table-col-desktop-only');
  });
});
