import { render, screen, within } from '../../test/test-utils';
import DayVsGoals from './DayVsGoals';
import { nutrients } from '../../test/nutritionFixtures';

const GOALS = { kcal: 1550, protein: 118.8, carbs: 149.9, fat: 52.8, fiber: 25 };

describe('DayVsGoals', () => {
  it('shows the day kcal against the target with a progress bar', () => {
    render(<DayVsGoals totals={nutrients(1477, 102, 155, 52, 20)} goals={GOALS} weightKg={66} />);
    const card = screen.getByRole('region', { name: 'Resumo do dia' });
    expect(within(card).getByText('Metas vindas da anamnese')).toBeInTheDocument();
    expect(within(card).getByText('1.477')).toBeInTheDocument();
    expect(within(card).getByText('/ 1.550 kcal')).toBeInTheDocument();
    expect(within(card).getByRole('progressbar', { name: 'Energia' })).toHaveAttribute('aria-valuenow', '95');
  });

  it('lists protein, carbs and fat against their goals with the g/kg of the protein', () => {
    render(<DayVsGoals totals={nutrients(1477, 102, 155, 52, 20)} goals={GOALS} weightKg={66} />);
    expect(screen.getByText('Proteína')).toBeInTheDocument();
    expect(screen.getByText('102 g')).toBeInTheDocument();
    expect(screen.getByText('/ 119 g · 1,5 g/kg')).toBeInTheDocument();
    expect(screen.getByText('Carboidrato')).toBeInTheDocument();
    expect(screen.getByText('Gordura')).toBeInTheDocument();
    expect(screen.getByText('/ 150 g')).toBeInTheDocument();
    expect(screen.getByText('/ 53 g')).toBeInTheDocument();
  });

  it('warns how many grams a macro is below its goal', () => {
    render(<DayVsGoals totals={nutrients(1477, 102, 155, 52, 20)} goals={GOALS} weightKg={66} />);
    expect(screen.getByText('17 g abaixo da meta')).toBeInTheDocument();
  });

  it('hides the warning when the goal is reached and the g/kg without weight', () => {
    render(<DayVsGoals totals={nutrients(1550, 120, 150, 53, 25)} goals={GOALS} />);
    expect(screen.queryByText(/abaixo da meta/)).not.toBeInTheDocument();
    expect(screen.queryByText(/g\/kg/)).not.toBeInTheDocument();
  });

  it('shows only the day total when there is no kcal goal yet', () => {
    render(<DayVsGoals totals={nutrients(500, 30, 60, 10, 5)} goals={{ kcal: null, protein: null, carbs: null, fat: null, fiber: null }} />);
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
