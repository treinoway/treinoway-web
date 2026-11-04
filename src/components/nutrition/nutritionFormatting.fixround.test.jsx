import { render, renderWithRouter, screen, within } from '../../test/test-utils';
import AdherenceKpis from './AdherenceKpis';
import AppPreview from './AppPreview';
import DayGoalTiles from './DayGoalTiles';
import { GuidancePreview } from './GuidanceSections';
import PatientRow from './PatientRow';
import SheetCard from './SheetCard';
import SwapEditor from './SwapEditor';
import { buildItem, buildMeal, buildPatientRow, buildSubstitute, nutrients } from '../../test/nutritionFixtures';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { items: [] } }), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('pt-BR number formatting (fix round)', () => {
  it('PatientRow shows a decimal weight with a comma', () => {
    renderWithRouter(<table><tbody><PatientRow patient={buildPatientRow({ weightKg: 66.5 })} onUnlink={vi.fn()} /></tbody></table>);
    expect(screen.getByText('66,5 kg')).toBeInTheDocument();
    expect(screen.queryByText('66.5 kg')).not.toBeInTheDocument();
  });

  it('PatientRow shows a fractional adherence percent with a comma', () => {
    const patient = buildPatientRow({ adherence7d: { done: 23, expected: 28, percent: 82.5 } });
    renderWithRouter(<table><tbody><PatientRow patient={patient} onUnlink={vi.fn()} /></tbody></table>);
    expect(screen.getByText('82,5%')).toBeInTheDocument();
  });

  it('AdherenceKpis uses thousands separators and a decimal comma', () => {
    const adherence = {
      percent: 82.5,
      mealsDone: 1234,
      mealsExpected: 2000,
      swaps: { total: 1234, topPair: null },
      ateDifferent: { total: 5, topMealName: null },
    };
    render(<AdherenceKpis adherence={adherence} />);
    expect(screen.getByText('82,5%')).toBeInTheDocument();
    expect(screen.getByText('1.234 de 2.000 refeições')).toBeInTheDocument();
    expect(screen.getByText('1.234')).toBeInTheDocument();
  });

  it('SheetCard formats weight, height and body fat with a decimal comma', () => {
    const sheet = { sex: 'female', age: 29, weightKg: 66.5, heightCm: 165.5, bodyFatPct: 28.5, assessedAt: '2026-10-12' };
    render(<SheetCard sheet={sheet} complete onEdit={vi.fn()} />);
    expect(screen.getByText('66,5 kg')).toBeInTheDocument();
    expect(screen.getByText('165,5 cm')).toBeInTheDocument();
    expect(screen.getByText('28,5% de gordura')).toBeInTheDocument();
  });

  it('SwapEditor formats the original quantity with a decimal comma', () => {
    const item = buildItem({ name: 'Peito de frango', quantity: 120.5, substitutes: [buildSubstitute()] });
    render(<SwapEditor item={item} onChangeBasis={vi.fn()} onRemove={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByText(/Original: Peito de frango · 120,5 g/)).toBeInTheDocument();
  });

  it('DayGoalTiles formats the fiber minimum with a decimal comma', () => {
    const goals = { kcal: null, protein: null, carbs: null, fat: null, fiber: 25.5 };
    render(<DayGoalTiles totals={nutrients(0, 0, 0, 0, 10)} goals={goals} />);
    expect(screen.getByText('mínimo de 25,5 g')).toBeInTheDocument();
  });
});

describe('neutral copy when the patient has no first name (fix round)', () => {
  it('AppPreview says "Como o paciente vê" instead of "Como a null vê"', () => {
    render(<AppPreview firstName={null} meal={buildMeal()} />);
    expect(screen.getByRole('region', { name: 'Como o paciente vê' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Como o paciente vê' })).toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });

  it('AppPreview keeps the named copy when the first name exists', () => {
    render(<AppPreview firstName="Luiza" meal={buildMeal()} />);
    expect(screen.getByRole('region', { name: 'Como a Luiza vê' })).toBeInTheDocument();
  });

  it('GuidancePreview says "Como o paciente vê" without a first name', () => {
    render(<GuidancePreview firstName={null} waterTargetMl={2500} perWeek={1} supplements={[]} />);
    const preview = screen.getByRole('region', { name: 'Como o paciente vê' });
    expect(within(preview).getByRole('heading', { name: 'Como o paciente vê' })).toBeInTheDocument();
    expect(preview).not.toHaveTextContent('null');
  });
});
