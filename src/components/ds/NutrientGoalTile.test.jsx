import { render, screen, within } from '../../test/test-utils';
import NutrientGoalTile from './NutrientGoalTile';

// Test helper: render tile.
const renderTile = (props = {}) =>
  render(
    <NutrientGoalTile
      label="Energia"
      value={1477}
      goal={1550}
      unit="kcal"
      status="ok"
      {...props}
    />,
  );

describe('NutrientGoalTile (DS new component)', () => {
  it('shows the label, the value and the goal with unit', () => {
    renderTile();
    const bar = screen.getByRole('progressbar', { name: 'Energia' });
    const tile = bar.closest('.nutrient-goal-tile');
    expect(tile).not.toBeNull();
    expect(within(tile).getByText('Energia')).toBeInTheDocument();
    expect(within(tile).getByText('1.477')).toBeInTheDocument();
    expect(within(tile).getByText(/\/\s*1\.550 kcal/)).toBeInTheDocument();
  });

  it('exposes the progress against the goal as a progressbar (0-100)', () => {
    renderTile();
    const bar = screen.getByRole('progressbar', { name: 'Energia' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '95');
  });

  it('clamps the progress at 100 when the value is far above the goal', () => {
    renderTile({ value: 3100, status: 'high' });
    expect(screen.getByRole('progressbar', { name: 'Energia' })).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps the progress at 0 for a zero value', () => {
    renderTile({ value: 0, status: 'low' });
    expect(screen.getByRole('progressbar', { name: 'Energia' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('status ok reads "NA META" in a brand Badge', () => {
    const { container } = renderTile({ status: 'ok' });
    const badge = screen.getByText('NA META');
    expect(badge).toBeInTheDocument();
    expect(container.querySelector('.badge.badge--brand')).toContainElement(badge);
  });

  it('status low reads "ABAIXO" with the signed difference in kcal', () => {
    const { container } = renderTile({ value: 1477, status: 'low' });
    expect(screen.getByText(/ABAIXO\s+−73\s+kcal/)).toBeInTheDocument();
    expect(screen.queryByText('NA META')).not.toBeInTheDocument();
    expect(container.querySelector('.badge.badge--warning')).not.toBeNull();
    expect(container.querySelector('.nutrient-goal-tile__fill--off')).not.toBeNull();
  });

  it('status high reads "ACIMA" with the signed difference', () => {
    const { container } = renderTile({ value: 1650, status: 'high' });
    expect(screen.getByText(/ACIMA\s+\+100\s+kcal/)).toBeInTheDocument();
    expect(container.querySelector('.badge.badge--warning')).not.toBeNull();
  });

  it('formats gram nutrients with one decimal and a comma', () => {
    renderTile({ label: 'Proteína', value: 102, goal: 118.8, unit: 'g', status: 'low' });
    const tile = screen.getByRole('progressbar', { name: 'Proteína' }).closest('.nutrient-goal-tile');
    expect(within(tile).getByText('102,0')).toBeInTheDocument();
    expect(within(tile).getByText(/\/\s*118,8 g/)).toBeInTheDocument();
    expect(within(tile).getByText(/ABAIXO\s+−16,8\s+g/)).toBeInTheDocument();
  });

  it('renders the extra line when given', () => {
    renderTile({ extra: '95% da meta' });
    expect(screen.getByText('95% da meta')).toBeInTheDocument();
  });

  it('does not render an extra line when none is given', () => {
    renderTile();
    expect(screen.getByRole('progressbar', { name: 'Energia' })).toBeInTheDocument();
    expect(screen.queryByText(/da meta/)).not.toBeInTheDocument();
  });

  it('for a minimum goal (fiber) a value above the goal is still "NA META"', () => {
    renderTile({ label: 'Fibras', value: 30, goal: 25, unit: 'g', status: 'ok', isMinimum: true, extra: 'mínimo de 25 g' });
    expect(screen.getByText('NA META')).toBeInTheDocument();
    expect(screen.getByText('mínimo de 25 g')).toBeInTheDocument();
  });
});
