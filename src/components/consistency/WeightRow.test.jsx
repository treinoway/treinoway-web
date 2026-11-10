import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '../../test/test-utils';
import WeightRow from './WeightRow';

const PILLARS = ['workouts', 'cardio', 'diet'];

// Stateful stand-in for the settings page: keeps weights and toggles, derives each effective share from the active weights
const Harness = () => {
  const [weights, setWeights] = useState({ workouts: 30, cardio: 15, diet: 30 });
  const [active, setActive] = useState(['workouts', 'cardio']);
  const total = active.reduce((sum, pillar) => sum + weights[pillar], 0);
  const handleActive = (pillar, next) => setActive((current) => (next ? [...current, pillar] : current.filter((item) => item !== pillar)));
  return (
    <>
      {PILLARS.map((pillar) => (
        <WeightRow
          key={pillar}
          pillar={pillar}
          weight={weights[pillar]}
          active={active.includes(pillar)}
          effectivePercent={active.includes(pillar) ? (weights[pillar] / total) * 100 : null}
          onWeightChange={(name, value) => setWeights((current) => ({ ...current, [name]: value }))}
          onActiveChange={handleActive}
        />
      ))}
    </>
  );
};

const DIET_NOTE = 'Ligue quando tua consultoria passar dieta. Hoje o peso dela se redistribui.';

describe('WeightRow', () => {
  it('PAN-38 shows the pillar, its description, its weight and its effective weight', () => {
    render(<Harness />);
    expect(screen.getByText('Treinos')).toBeInTheDocument();
    expect(screen.getByText('Treino do plano marcado como concluído')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' })).toHaveValue(30);
    expect(screen.getByRole('slider', { name: 'Peso de Treinos' })).toHaveValue('30');
    expect(screen.getByText('66,7%')).toBeInTheDocument();
    expect(screen.getByText('33,3%')).toBeInTheDocument();
  });

  it('PAN-38 updates effective weights when the slider moves', () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole('slider', { name: 'Peso de Treinos' }), { target: { value: '15' } });
    expect(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' })).toHaveValue(15);
    expect(screen.getAllByText('50,0%')).toHaveLength(2);
  });

  it('PAN-38 updates effective weights when a number is typed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole('spinbutton', { name: 'Valor do peso de Cardio' });
    await user.clear(field);
    await user.type(field, '30');
    expect(field).toHaveValue(30);
    expect(screen.getByRole('slider', { name: 'Peso de Cardio' })).toHaveValue('30');
    expect(screen.getAllByText('50,0%')).toHaveLength(2);
  });

  it('PAN-38 keeps typed numbers between 0 and 100', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const field = screen.getByRole('spinbutton', { name: 'Valor do peso de Cardio' });
    await user.clear(field);
    await user.type(field, '250');
    expect(field).toHaveValue(100);
    await user.clear(field);
    expect(field).toHaveValue(0);
  });

  it('PAN-38 takes a pillar out of the count with the toggle and brings it back', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const toggle = screen.getByRole('switch', { name: 'Incluir Cardio no ranking' });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(screen.getAllByText('fora')).toHaveLength(2);
    expect(screen.getByText('100,0%')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Peso de Cardio' })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Valor do peso de Cardio' })).toBeDisabled();
    await user.click(toggle);
    expect(screen.getByText('33,3%')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Peso de Cardio' })).toBeEnabled();
  });

  it('PAN-38 explains that Dieta is out of the count while it is off', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText(DIET_NOTE)).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Incluir Dieta no ranking' }));
    expect(screen.queryByText(DIET_NOTE)).not.toBeInTheDocument();
  });
});
