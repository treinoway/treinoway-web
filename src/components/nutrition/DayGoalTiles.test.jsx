import { render, screen, within } from '../../test/test-utils';
import DayGoalTiles from './DayGoalTiles';
import { nutrients } from '../../test/nutritionFixtures';

const GOALS = { kcal: 400, protein: 40, carbs: 80, fat: 4, fiber: 25 };
// Test helper: the tile of a nutrient.
const tile = (name) => screen.getByRole('progressbar', { name }).closest('.nutrient-goal-tile');

describe('DayGoalTiles', () => {
  it('renders one progress tile per nutrient with a goal and treats fiber as a minimum', () => {
    render(<DayGoalTiles totals={nutrients(400, 25, 80, 4, 30)} goals={GOALS} />);
    expect(screen.getAllByRole('progressbar')).toHaveLength(5);
    expect(screen.getByText('mínimo de 25 g')).toBeInTheDocument();
    expect(screen.getByText(/ABAIXO\s+−15,0\s+g/)).toBeInTheDocument();
    expect(screen.getAllByText('NA META')).toHaveLength(4);
  });

  it('shows the share of the energy goal, g/kg for protein and the VET share for carbs and fat', () => {
    render(<DayGoalTiles totals={nutrients(400, 25, 80, 4, 30)} goals={GOALS} weightKg={50} />);
    expect(within(tile('Energia')).getByText('100% da meta')).toBeInTheDocument();
    expect(within(tile('Proteína')).getByText('0,5 de 0,8 g/kg')).toBeInTheDocument();
    expect(within(tile('Carboidrato')).getByText('80,0% do VET')).toBeInTheDocument();
    expect(within(tile('Lipídio')).getByText('9,0% do VET')).toBeInTheDocument();
  });

  it('omits the g/kg line without a weight', () => {
    render(<DayGoalTiles totals={nutrients(400, 25, 80, 4, 30)} goals={GOALS} />);
    expect(screen.queryByText(/g\/kg/)).not.toBeInTheDocument();
  });

  it('skips nutrients without a goal', () => {
    render(<DayGoalTiles totals={nutrients(400, 25, 80, 4, 8)} goals={{ kcal: 400, protein: null, carbs: null, fat: null, fiber: null }} />);
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('points to the goals step when no goal is set', () => {
    render(<DayGoalTiles totals={nutrients()} goals={{ kcal: null, protein: null, carbs: null, fat: null, fiber: null }} />);
    expect(screen.getByText(/Defina as metas na etapa anterior/)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
