import { useState } from 'react';
import PropTypes from 'prop-types';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '../../test/test-utils';
import ScoringSection from './ScoringSection';

const RANKING_BASE = {
  weights: { workouts: 30, cardio: 15, feedback: 15, hydration: 10, diet: 30 },
  activePillars: ['workouts', 'cardio', 'feedback', 'hydration'],
  source: 'ranking',
};
const PILLAR_NAMES = ['Treinos', 'Cardio', 'Feedback', 'Hidratação', 'Dieta'];
const RANKING_PHRASE = 'Peso efetivo com Dieta desligada: Treinos 42,9% · Cardio 21,4% · Feedback 21,4% · Hidratação 14,3%';

// Form stand-in that keeps the section value, starting from the base rule
const Host = ({ base }) => {
  const [value, setValue] = useState({ weights: { ...base.weights }, activePillars: [...base.activePillars] });
  return <ScoringSection value={value} base={base} onChange={setValue} />;
};

Host.propTypes = { base: PropTypes.object.isRequired };

describe('ScoringSection', () => {
  it('CPD-01 shows "Igual ao ranking geral" with the effective share of each active pillar', () => {
    render(<Host base={RANKING_BASE} />);
    expect(screen.getByText('Pontuação')).toBeInTheDocument();
    expect(screen.getByText('Igual ao ranking geral')).toBeInTheDocument();
    expect(screen.getByText(RANKING_PHRASE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar a do ranking geral' })).not.toBeInTheDocument();
  });

  it('CPD-02 shows the five pillars with toggle, weight, effective share and the weights sum after Personalizar', async () => {
    const user = userEvent.setup();
    render(<Host base={RANKING_BASE} />);
    expect(screen.queryByRole('switch', { name: 'Incluir Treinos no ranking' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Personalizar' }));

    PILLAR_NAMES.forEach((name) => {
      expect(screen.getByRole('switch', { name: `Incluir ${name} no ranking` })).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: `Valor do peso de ${name}` })).toBeInTheDocument();
    });
    expect(screen.getByText('42,9%')).toBeInTheDocument();
    expect(screen.getByText('14,3%')).toBeInTheDocument();
    expect(screen.getByText('fora')).toBeInTheDocument();
    expect(screen.getByText('Soma dos pesos')).toBeInTheDocument();
    expect(screen.getByText('100 de 100')).toBeInTheDocument();
  });

  it('CPD-03 switches the summary to "Personalizada" and updates the sum when a weight changes', async () => {
    const user = userEvent.setup();
    render(<Host base={RANKING_BASE} />);
    await user.click(screen.getByRole('button', { name: 'Personalizar' }));

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' }), { target: { value: '40' } });

    expect(screen.getByText('Personalizada')).toBeInTheDocument();
    expect(screen.queryByText('Igual ao ranking geral')).not.toBeInTheDocument();
    expect(screen.getByText('110 de 100')).toHaveClass('weights-summary__total--invalid');
    expect(screen.getByText('Peso efetivo com Dieta desligada: Treinos 50,0% · Cardio 18,8% · Feedback 18,8% · Hidratação 12,5%')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Incluir Cardio no ranking' }));
    expect(screen.getByText('Personalizada')).toBeInTheDocument();
    expect(screen.getByText('Peso efetivo com Cardio e Dieta desligados: Treinos 61,5% · Feedback 23,1% · Hidratação 15,4%')).toBeInTheDocument();
  });

  it('CPD-04 restores the general ranking weights with "Usar a do ranking geral"', async () => {
    const user = userEvent.setup();
    render(<Host base={RANKING_BASE} />);
    await user.click(screen.getByRole('button', { name: 'Personalizar' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' }), { target: { value: '40' } });
    await user.click(screen.getByRole('switch', { name: 'Incluir Dieta no ranking' }));
    expect(screen.getByText('Personalizada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Usar a do ranking geral' }));

    expect(screen.getByText('Igual ao ranking geral')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Valor do peso de Treinos' })).toHaveValue(30);
    expect(screen.getByRole('switch', { name: 'Incluir Dieta no ranking' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('100 de 100')).not.toHaveClass('weights-summary__total--invalid');
    expect(screen.queryByRole('button', { name: 'Usar a do ranking geral' })).not.toBeInTheDocument();
  });

  it('CPD-81 shows "Padrão" when the weights came from the defaults', () => {
    render(<Host base={{ ...RANKING_BASE, source: 'default' }} />);
    expect(screen.getByText('Padrão')).toBeInTheDocument();
    expect(screen.queryByText('Igual ao ranking geral')).not.toBeInTheDocument();
    expect(screen.getByText(RANKING_PHRASE)).toBeInTheDocument();
  });
});
