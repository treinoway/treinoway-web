import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import SheetCard from './SheetCard';
import { buildSheet } from '../../test/nutritionFixtures';

describe('SheetCard', () => {
  it('lists the known facts and the assessment date', () => {
    render(<SheetCard sheet={buildSheet()} complete onEdit={vi.fn()} />);
    ['Feminino', '29 anos', '66 kg', '165 cm', '28% de gordura'].forEach((fact) => expect(screen.getByText(fact)).toBeInTheDocument());
    expect(screen.getByText(/Da avaliação de 12\/10\./)).toBeInTheDocument();
    expect(screen.queryByText(/Complete sexo, peso e altura/)).not.toBeInTheDocument();
  });

  it('skips unknown facts and warns when the sheet is incomplete', () => {
    render(<SheetCard sheet={buildSheet({ bodyFatPct: null, weightKg: null, assessedAt: null })} complete={false} onEdit={vi.fn()} />);
    expect(screen.queryByText(/de gordura/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Da avaliação de/)).not.toBeInTheDocument();
    expect(screen.getByText(/Complete sexo, peso e altura/)).toBeInTheDocument();
  });

  it('calls onEdit from the button', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<SheetCard sheet={buildSheet()} complete onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: 'Editar ficha' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
