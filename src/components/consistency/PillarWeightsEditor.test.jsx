import { useState } from 'react';
import PropTypes from 'prop-types';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '../../test/test-utils';
import PillarWeightsEditor from './PillarWeightsEditor';

const WEIGHTS = { workouts: 30, cardio: 15, feedback: 15, hydration: 10, diet: 30 };
const ACTIVE = ['workouts', 'cardio', 'feedback', 'hydration'];
const PILLAR_NAMES = ['Treinos', 'Cardio', 'Feedback', 'Hidratação', 'Dieta'];

// Stateful host that keeps the weights and active pillars the editor changes
const Host = ({ disabled = false }) => {
  const [weights, setWeights] = useState(WEIGHTS);
  const [active, setActive] = useState(ACTIVE);
  const handleActive = (pillar, next) => setActive((current) => (next ? [...current, pillar] : current.filter((item) => item !== pillar)));
  return (
    <PillarWeightsEditor
      weights={weights}
      activePillars={active}
      onWeightChange={(pillar, value) => setWeights((current) => ({ ...current, [pillar]: value }))}
      onActiveChange={handleActive}
      disabled={disabled}
    />
  );
};

Host.propTypes = { disabled: PropTypes.bool };

describe('PillarWeightsEditor', () => {
  it('shows five pillars with toggle, weight, effective share and the weights sum', async () => {
    const user = userEvent.setup();
    render(<Host />);

    PILLAR_NAMES.forEach((name) => {
      expect(screen.getByRole('switch', { name: `Incluir ${name} no ranking` })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: `Valor do peso de ${name}` })).toBeInTheDocument();
    });
    expect(screen.getByRole('switch', { name: 'Incluir Dieta no ranking' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' })).toHaveValue(30);
    expect(screen.getAllByText('21,4%')).toHaveLength(2);
    expect(screen.getByText('42,9%')).toBeInTheDocument();
    expect(screen.getByText('fora')).toBeInTheDocument();
    expect(screen.getByText('100 de 100')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Soma dos pesos' })).toHaveAttribute('aria-valuenow', '100');

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' }), { target: { value: '40' } });
    expect(screen.getByText('110 de 100')).toHaveClass('weights-summary__total--invalid');

    await user.click(screen.getByRole('switch', { name: 'Incluir Dieta no ranking' }));
    expect(screen.getByRole('switch', { name: 'Incluir Dieta no ranking' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Peso efetivo com todos os pilares ligados: Treinos 36,4% · Cardio 13,6% · Feedback 13,6% · Hidratação 9,1% · Dieta 27,3%')).toBeInTheDocument();
  });

  it('locks every control when disabled', () => {
    render(<Host disabled />);
    expect(screen.getByRole('switch', { name: 'Incluir Treinos no ranking' })).toBeDisabled();
    expect(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' })).toBeDisabled();
  });
});
