import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import MacroTargetsCard from './MacroTargetsCard';
import { buildGoals } from '../../test/nutritionFixtures';
import { macroTargets } from '../../utils/nutritionCalc';

// Test helper: macros for the given goals at 66 kg.
const macrosFor = (goals) => macroTargets({ ...goals, kcal: goals.kcalTarget }, 66);

// Test helper: renders the card.
const renderCard = (goalOverrides = {}, props = {}) => {
  const goals = buildGoals({ kcalTarget: 1550, ...goalOverrides });
  const onChange = vi.fn();
  render(<MacroTargetsCard goals={goals} macros={macrosFor(goals)} weightKg={66} suggestion={1533.4} onChange={onChange} {...props} />);
  return { goals, onChange };
};

describe('MacroTargetsCard', () => {
  it('shows grams, kcal and %VET per macro with carbs as the remainder', () => {
    renderCard();
    const protein = screen.getByRole('row', { name: /Proteína/ });
    expect(within(protein).getByText('118,8')).toBeInTheDocument();
    expect(within(protein).getByText('475')).toBeInTheDocument();
    expect(within(protein).getByText('30,7%')).toBeInTheDocument();
    const carbs = screen.getByRole('row', { name: /Carboidrato/ });
    expect(within(carbs).getByText('Restante')).toBeInTheDocument();
    expect(within(carbs).getByText('2,27')).toBeInTheDocument();
    expect(screen.queryByLabelText('Carboidrato (g/kg)')).not.toBeInTheDocument();
  });

  it('reports a closed total in the info tone', () => {
    renderCard();
    expect(screen.getByText('Os macros fecham 1.550 kcal, igual à meta.')).toHaveClass('macro-check--ok');
  });

  it('lists the macro distribution of the VET and the minimum fiber', () => {
    renderCard();
    expect(screen.getByText('Proteína 30,7% · Carboidrato 38,7% · Lipídio 30,7%')).toBeInTheDocument();
    expect(screen.getByLabelText('Fibras mínimo (g)')).toHaveValue(25);
  });

  it('reports how far the macros are above the target when carbs are manual', () => {
    renderCard({ carbIsRemainder: false, carbPerKg: 2.3 });
    expect(screen.getByText('Os macros somam 1.558 kcal, 8 acima da meta calórica.')).toHaveClass('macro-check--warning');
    expect(screen.getByLabelText('Carboidrato (g/kg)')).toHaveValue(2.3);
  });

  it('warns when protein and fat already pass the target', () => {
    renderCard({ kcalTarget: 900 });
    expect(screen.getByText('Proteína e lipídio já passam da meta calórica. Revê os g/kg ou a meta.')).toHaveClass('macro-check--warning');
  });

  it('asks for the target when there are no macros', () => {
    const goals = buildGoals({ kcalTarget: null });
    render(<MacroTargetsCard goals={goals} macros={null} weightKg={66} onChange={vi.fn()} />);
    expect(screen.getByText('Defina a meta calórica para ver os macros.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usar sugestão/ })).not.toBeInTheDocument();
  });

  it('edits the calorie target', async () => {
    const user = userEvent.setup();
    const { goals, onChange } = renderCard();
    await user.type(screen.getByRole('spinbutton', { name: 'Meta calórica' }), '0');
    expect(onChange).toHaveBeenLastCalledWith({ ...goals, kcalTarget: 15500 });
  });

  it('uses the suggestion as the target', async () => {
    const user = userEvent.setup();
    const { goals, onChange } = renderCard();
    await user.click(screen.getByRole('button', { name: 'Usar sugestão · 1.533' }));
    expect(onChange).toHaveBeenCalledWith({ ...goals, kcalTarget: 1533 });
  });

  it('freezes the implied carbs g/kg when the remainder switch is turned off', async () => {
    const user = userEvent.setup();
    const { goals, onChange } = renderCard();
    await user.click(screen.getByRole('switch', { name: 'Carboidrato completa as calorias que faltam' }));
    expect(onChange).toHaveBeenCalledWith({ ...goals, carbIsRemainder: false, carbPerKg: 2.3 });
  });

  it('turns the remainder back on keeping the typed carbs g/kg', async () => {
    const user = userEvent.setup();
    const { goals, onChange } = renderCard({ carbIsRemainder: false, carbPerKg: 2.1 });
    await user.click(screen.getByRole('switch', { name: 'Carboidrato completa as calorias que faltam' }));
    expect(onChange).toHaveBeenCalledWith({ ...goals, carbIsRemainder: true, carbPerKg: 2.1 });
  });

  it('edits protein g/kg and clears an emptied field to null', async () => {
    const user = userEvent.setup();
    const { goals, onChange } = renderCard();
    await user.clear(screen.getByLabelText('Proteína (g/kg)'));
    expect(onChange).toHaveBeenLastCalledWith({ ...goals, proteinPerKg: null });
  });
});
