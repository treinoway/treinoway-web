import { render, screen, within } from '../../test/test-utils';
import AppPreview from './AppPreview';
import { buildItem, buildMeal, buildOption, buildSubstitute, nutrients } from '../../test/nutritionFixtures';

// Test helper: a lunch with two items, one with a swap.
const lunch = () => buildMeal({
  name: 'Almoço',
  time: '12:30',
  options: [buildOption({
    items: [
      buildItem({ id: 'a', name: 'Arroz, integral, cozido', householdMeasure: '4 col. de sopa', quantity: 100, substitutes: [buildSubstitute()] }),
      buildItem({ id: 'b', name: 'Salada de folhas', householdMeasure: null, quantity: 100 }),
    ],
    totals: nutrients(437, 46, 40, 10, 0),
  })],
});

describe('AppPreview', () => {
  it('names the patient and the meal being previewed', () => {
    render(<AppPreview firstName="Luiza" meal={lunch()} />);
    const card = screen.getByRole('region', { name: 'Como a Luiza vê' });
    expect(within(card).getByText('Prévia do almoço no app')).toBeInTheDocument();
    expect(within(card).getByText('Atualiza no app quando o plano for publicado.')).toBeInTheDocument();
  });

  it('is neutral when the patient first name is unknown', () => {
    render(<AppPreview firstName={null} meal={lunch()} />);
    expect(screen.getByRole('region', { name: 'Como o paciente vê' })).toBeInTheDocument();
  });

  it('draws the phone with the meal, macro chips, items and the done button', () => {
    render(<AppPreview firstName="Luiza" meal={lunch()} />);
    expect(screen.getByText('12:30')).toBeInTheDocument();
    expect(screen.getByText('46g')).toBeInTheDocument();
    expect(screen.getByText('Proteína')).toBeInTheDocument();
    expect(screen.getByText('Carbo')).toBeInTheDocument();
    expect(screen.getByText('Gordura')).toBeInTheDocument();
    expect(screen.getByText('Arroz')).toBeInTheDocument();
    expect(screen.getByText('4 col. de sopa · 100 g')).toBeInTheDocument();
    expect(screen.getByText('Marcar como feita')).toBeInTheDocument();
  });

  it('shows TROCAR only on items that have swaps', () => {
    render(<AppPreview firstName="Luiza" meal={lunch()} />);
    expect(screen.getAllByText('Trocar')).toHaveLength(1);
  });

  it('asks for a meal when the plan has none', () => {
    render(<AppPreview firstName="Luiza" meal={undefined} />);
    expect(screen.getByText('Adicione uma refeição para ver a prévia.')).toBeInTheDocument();
  });
});
