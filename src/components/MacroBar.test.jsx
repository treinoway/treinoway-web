import { screen } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import MacroBar from './MacroBar';

describe('MacroBar', () => {
  it('renders accessible wrapper with macro distribution label', () => {
    renderWithRouter(<MacroBar proteinG={30} carbsG={50} fatG={10} />);
    expect(screen.getByLabelText('Distribuição de macronutrientes')).toBeInTheDocument();
  });

  it('displays protein, carbs, and fat labels', () => {
    renderWithRouter(<MacroBar proteinG={30} carbsG={50} fatG={10} />);
    expect(screen.getByText(/Prot:/)).toBeInTheDocument();
    expect(screen.getByText(/Carb:/)).toBeInTheDocument();
    expect(screen.getByText(/Gord:/)).toBeInTheDocument();
  });

  it('shows em-dash for null macros', () => {
    renderWithRouter(<MacroBar proteinG={null} carbsG={null} fatG={null} />);
    // formatMacro(null) returns '—'
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it('shows gram values', () => {
    renderWithRouter(<MacroBar proteinG={25} carbsG={60} fatG={15} />);
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
