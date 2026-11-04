import { render, screen, within } from '../../test/test-utils';
import VetDistribution from './VetDistribution';
import { nutrients } from '../../test/nutritionFixtures';

describe('VetDistribution', () => {
  it('shows each macro share of the day kcal next to the goal share', () => {
    const macros = { protein: { pct: 30 }, carbs: { pct: 45 }, fat: { pct: 25 } };
    render(<VetDistribution totals={nutrients(400, 20, 57.5, 10, 0)} macros={macros} />);
    const legend = within(screen.getByRole('region', { name: 'Distribuição do VET' })).getByRole('list');
    const item = (label) => within(legend).getByText(new RegExp(`^${label}`)).closest('li');
    expect(item('Proteína')).toHaveTextContent('Proteína 20,0% · meta 30,0%');
    expect(item('Carboidrato')).toHaveTextContent('Carboidrato 57,5% · meta 45,0%');
    expect(item('Lipídio')).toHaveTextContent('Lipídio 22,5% · meta 25,0%');
  });

  it('sizes the stacked bar by the menu shares', () => {
    const { container } = render(<VetDistribution totals={nutrients(400, 20, 57.5, 10, 0)} macros={null} />);
    const widths = Array.from(container.querySelectorAll('.vet-distribution__segment')).map((segment) => segment.style.width);
    expect(widths).toEqual(['20%', '57.5%', '22.5%']);
  });

  it('shows dashes while the day has no kcal and no goal', () => {
    render(<VetDistribution totals={nutrients()} macros={null} />);
    expect(screen.getByText('Proteína -')).toBeInTheDocument();
    expect(screen.getAllByText('· meta -')).toHaveLength(3);
  });
});
