import { render, screen } from '../../test/test-utils';
import AdherenceKpis from './AdherenceKpis';
import { buildOverview } from '../../test/nutritionFixtures';

describe('AdherenceKpis', () => {
  it('shows labelled tiles for adherence, swaps with the top pair and ate-different with the meal', () => {
    render(<AdherenceKpis adherence={buildOverview().adherence7d} />);
    expect(screen.getByText('Adesão · 7 dias')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('23 de 28 refeições')).toBeInTheDocument();
    expect(screen.getByText('Trocas usadas')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText(/frango → patinho/)).toBeInTheDocument();
    expect(screen.getByText('Comeu diferente')).toBeInTheDocument();
    expect(screen.getByText(/Lanche da tarde/)).toBeInTheDocument();
  });

  it('omits the supports when there is nothing to point at', () => {
    const adherence = { mealsDone: 0, mealsExpected: 0, percent: 0, swaps: { total: 0, topPair: null }, ateDifferent: { total: 0, topMealName: null } };
    render(<AdherenceKpis adherence={adherence} />);
    expect(screen.queryByText(/Mais pedida/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mais em/)).not.toBeInTheDocument();
  });
});
