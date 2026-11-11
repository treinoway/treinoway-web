import { renderWithRouter as render, screen, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import EnergyCard from './EnergyCard';

const SHEET = { sex: 'female', age: 30, weightKg: 70, heightCm: 165, bodyFatPct: null, assessedAt: '2026-03-10' };
const GOALS = { bmrFormula: 'mifflin', activityFactor: 1.375, objective: 'deficit_20', activities: [] };
const PANEL = { tee: 1916, suggestion: 1533, bmr: 1395, base: 1918, activityKcal: -2, adjustment: -383 };

// Test helper: renders the card; onGoalChange(field) returns a shared onChange spy.
const setup = (props = {}) => {
  const onChange = vi.fn();
  const handlers = { onGoalChange: vi.fn(() => onChange), onEditSheet: vi.fn() };
  const view = render(<EnergyCard goals={GOALS} sheet={SHEET} panel={PANEL} sheetComplete trainerName="Ana" {...handlers} {...props} />);
  return { ...handlers, onChange, unmount: view.unmount };
};

describe('EnergyCard', () => {
  it('shows the energy total, suggestion and breakdown formatted in pt-BR', () => {
    setup();
    const panel = screen.getByRole('region', { name: 'Cálculo do gasto energético' });
    expect(within(panel).getByText('1.916')).toBeInTheDocument();
    expect(within(panel).getByText('1.533')).toBeInTheDocument();
    expect(within(panel).getByText('TMB · Mifflin-St Jeor')).toBeInTheDocument();
    expect(within(panel).getByText('Rotina · fator 1,375')).toBeInTheDocument();
    expect(within(panel).getByText('1.395')).toBeInTheDocument();
    expect(within(panel).getByText('−2')).toBeInTheDocument();
    expect(within(panel).getByText('−20% · −383')).toBeInTheDocument();
  });

  it('shows the empty message when there is no panel', () => {
    setup({ panel: null });
    expect(screen.getByText('Sem dados suficientes na ficha para este protocolo.')).toBeInTheDocument();
  });

  it('reports changes of protocol, routine and objective by field', async () => {
    const { onGoalChange, onChange } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Protocolo da TMB'), 'FAO/OMS (1985)');
    expect(onGoalChange).toHaveBeenCalledWith('bmrFormula');
    expect(onChange).toHaveBeenLastCalledWith('fao_who');
    await userEvent.selectOptions(screen.getByLabelText('Objetivo'), 'Manter o peso · sem ajuste');
    expect(onChange).toHaveBeenLastCalledWith('maintain');
    await userEvent.selectOptions(screen.getByLabelText('Rotina fora dos treinos'), 'Ativa · fator 1,55');
    expect(onChange).toHaveBeenLastCalledWith(1.55);
  });

  it('describes the selected protocol', () => {
    setup();
    expect(screen.getByText(/Boa precisão pra adultos/)).toBeInTheDocument();
  });

  it('asks for body fat on Katch-McArdle without it, and shows the lean mass with it', () => {
    const katch = { ...GOALS, bmrFormula: 'katch_mcardle' };
    const { unmount } = setup({ goals: katch });
    expect(screen.getByText('Informe o % de gordura na ficha para usar este protocolo.')).toBeInTheDocument();
    unmount();
    setup({ goals: katch, sheet: { ...SHEET, bodyFatPct: 20 } });
    expect(screen.getByText('Usa a massa magra da avaliação: 56,0 kg.')).toBeInTheDocument();
  });

  it('wires the edit-sheet action and warns when the sheet is incomplete', async () => {
    const { onEditSheet } = setup({ sheetComplete: false });
    expect(screen.getByText(/Complete sexo, peso e altura/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar ficha' }));
    expect(onEditSheet).toHaveBeenCalledTimes(1);
  });
});
