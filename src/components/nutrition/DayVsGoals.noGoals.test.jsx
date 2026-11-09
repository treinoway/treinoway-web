import { render, screen, within } from '../../test/test-utils';
import DayVsGoals from './DayVsGoals';
import { nutrients } from '../../test/nutritionFixtures';

const NO_GOALS = { kcal: null, protein: null, carbs: null, fat: null, fiber: null };
const GOALS = { kcal: 1550, protein: 118.8, carbs: 149.9, fat: 52.8, fiber: 25 };

describe('DayVsGoals without goals', () => {
  it('says there are no goals instead of claiming they come from the anamnesis', () => {
    render(<DayVsGoals totals={nutrients(696, 30, 60, 10, 5)} goals={NO_GOALS} />);
    const card = screen.getByRole('region', { name: 'Resumo do dia' });
    expect(within(card).getByText('Sem metas definidas')).toBeInTheDocument();
    expect(within(card).queryByText('Metas vindas da anamnese')).not.toBeInTheDocument();
  });

  it('shows the kcal unit next to the day value, which stays its own text', () => {
    render(<DayVsGoals totals={nutrients(696, 30, 60, 10, 5)} goals={NO_GOALS} />);
    expect(screen.getByText('696')).toBeInTheDocument();
    expect(screen.getByText('kcal')).toBeInTheDocument();
  });

  it('keeps the anamnesis subtitle and no bare unit when a kcal goal exists', () => {
    render(<DayVsGoals totals={nutrients(1477, 102, 155, 52, 20)} goals={GOALS} />);
    expect(screen.getByText('Metas vindas da anamnese')).toBeInTheDocument();
    expect(screen.queryByText('Sem metas definidas')).not.toBeInTheDocument();
    expect(screen.queryByText('kcal')).not.toBeInTheDocument();
  });
});
