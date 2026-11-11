import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, within, fireEvent } from '../../test/test-utils';
import SummaryMeal from './SummaryMeal';
import { buildItem, buildMeal, buildOption, nutrients } from '../../test/nutritionFixtures';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// Test helper: spies for every summary handler.
const makeHandlers = () => ({
  onChangeBasis: vi.fn(),
  onRemove: vi.fn(),
  onAdd: vi.fn().mockResolvedValue(true),
  onAddItem: vi.fn().mockResolvedValue(true),
  onRemoveItem: vi.fn(),
  onQuantityChange: vi.fn(),
});

// Test helper: a lunch with two items.
const lunch = () => buildMeal({
  name: 'Almoço',
  time: '12:30',
  options: [buildOption({
    items: [
      buildItem({ id: 'a', name: 'Arroz integral', unit: 'g', quantity: 100, nutrients: nutrients(124, 2.6, 25.8, 1, 2.7) }),
      buildItem({ id: 'b', name: 'Frango', unit: 'g', quantity: 120, nutrients: nutrients(190, 38.4, 0, 3, 0) }),
    ],
    totals: nutrients(314, 41, 25.8, 4, 2.7),
  })],
});

// Test helper: renders the meal expanded.
const renderExpanded = async (quantityTexts = { a: '100', b: '120' }) => {
  const user = userEvent.setup();
  const handlers = makeHandlers();
  renderWithRouter(<ul><SummaryMeal meal={lunch()} patientId="p1" handlers={handlers} quantityTexts={quantityTexts} /></ul>);
  await user.click(screen.getByRole('button', { name: /Almoço/ }));
  return { user, handlers };
};

describe('SummaryMeal editable quantity', () => {
  it('renders a number input per item with the draft text and the unit beside it', async () => {
    await renderExpanded({ a: '150', b: '120' });
    const input = screen.getByRole('spinbutton', { name: 'Quantidade de arroz integral' });
    expect(input).toHaveValue(150);
    expect(input).toHaveAttribute('type', 'number');
    expect(screen.getByRole('spinbutton', { name: 'Quantidade de frango' })).toHaveValue(120);
    expect(within(screen.getByRole('table')).getAllByText('g').length).toBeGreaterThanOrEqual(2);
  });

  it('calls handlers.onQuantityChange(itemId, raw) when typing', async () => {
    const { handlers } = await renderExpanded();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantidade de frango' }), { target: { value: '200' } });
    expect(handlers.onQuantityChange).toHaveBeenCalledWith('b', '200');
  });

  it('flags an empty or zero quantity as invalid with the error message', async () => {
    await renderExpanded({ a: '', b: '0' });
    expect(screen.getByRole('spinbutton', { name: 'Quantidade de arroz integral' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Quantidade de frango' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByText('Informe uma quantidade maior que zero.')).toHaveLength(2);
  });

  it('shows no error for valid quantities', async () => {
    await renderExpanded();
    expect(screen.getByRole('spinbutton', { name: 'Quantidade de frango' })).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText('Informe uma quantidade maior que zero.')).not.toBeInTheDocument();
  });
});
