import { render, screen } from '../../test/test-utils';
import FoodSourceBadge from './FoodSourceBadge';

describe('FoodSourceBadge (DS)', () => {
  it.each([
    ['taco', 'TACO'],
    ['tbca', 'TBCA'],
    ['custom', 'Meus alimentos'],
  ])('labels the %s source as "%s"', (source, label) => {
    render(<FoodSourceBadge source={source} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('falls back to the raw value for an unknown source', () => {
    render(<FoodSourceBadge source="outra" />);
    expect(screen.getByText('outra')).toBeInTheDocument();
  });
});
