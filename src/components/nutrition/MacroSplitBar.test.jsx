import { render, screen } from '../../test/test-utils';
import MacroSplitBar from './MacroSplitBar';

const MACROS = { protein: { pct: 25 }, carbs: { pct: 50.5 }, fat: { pct: 24.5 } };

describe('MacroSplitBar', () => {
  it('sizes each segment by its percentage', () => {
    render(<MacroSplitBar macros={MACROS} />);
    const parts = screen.getByRole('region', { name: 'Distribuição do VET' }).querySelectorAll('.macro-split__part');
    expect([...parts].map((part) => part.style.width)).toEqual(['25%', '50.5%', '24.5%']);
  });

  it('writes the legend with one decimal in pt-BR', () => {
    render(<MacroSplitBar macros={MACROS} />);
    expect(screen.getByText('Proteína 25,0% · Carboidrato 50,5% · Lipídio 24,5%')).toBeInTheDocument();
  });

  it('shows dashes and no segments without macros', () => {
    render(<MacroSplitBar macros={null} />);
    expect(screen.getByText('Proteína - · Carboidrato - · Lipídio -')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Distribuição do VET' }).querySelectorAll('.macro-split__part')).toHaveLength(0);
  });
});
