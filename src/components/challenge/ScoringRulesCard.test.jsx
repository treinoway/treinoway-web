import { useState } from 'react';
import PropTypes from 'prop-types';
import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import ScoringRulesCard from './ScoringRulesCard';

const RULE = {
  weights: { workouts: 60, cardio: 40, feedback: 0, hydration: 0, diet: 0 },
  activePillars: ['workouts', 'cardio'],
};
const POINTS = { ptsWorkoutCompleted: 10, ptsStreak7Days: 50, ptsStreak30Days: 250, ptsDailyCheckin: 2, ptsEvolutionRecord: 15, ptsWorkoutFeedback: 5 };

// Holds the rule and the points as the settings tab does and shows what the card reported
const Harness = ({ status, showPillars = true }) => {
  const [rule, setRule] = useState(RULE);
  const [points, setPoints] = useState(POINTS);
  return (
    <>
      <ScoringRulesCard status={status} showPillars={showPillars} rule={rule} points={points} onRuleChange={setRule} onPointsChange={(key, value) => setPoints((current) => ({ ...current, [key]: value }))} />
      <output aria-label="Estado">{JSON.stringify({ rule, points })}</output>
    </>
  );
};

Harness.propTypes = {
  status: PropTypes.string.isRequired,
  showPillars: PropTypes.bool,
};

// Reported state of the harness
const state = () => JSON.parse(screen.getByRole('status', { name: 'Estado' }).textContent);

const XP_LABELS = ['Treino concluído', 'Sequência de 7 dias', 'Sequência de 30 dias', 'Check-in diário', 'Registro de evolução', 'Feedback de treino'];

describe('ScoringRulesCard', () => {
  it('CPD-41 shows Pilares e pesos and the six XP rules', async () => {
    const user = userEvent.setup();
    render(<Harness status="scheduled" />);

    expect(screen.getByRole('heading', { name: 'Regras de pontuação' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pilares e pesos' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Soma dos pesos' })).toHaveAttribute('aria-valuenow', '100');
    XP_LABELS.forEach((label) => expect(screen.getByRole('spinbutton', { name: label })).toBeEnabled());
    expect(screen.getByRole('spinbutton', { name: 'Treino concluído' })).toHaveValue(10);
    expect(screen.getByRole('spinbutton', { name: 'Treino concluído' })).toHaveAccessibleDescription('Pontos por completar um treino');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    const field = screen.getByRole('spinbutton', { name: 'Sequência de 7 dias' });
    await user.clear(field);
    await user.type(field, '70');
    expect(state().points.ptsStreak7Days).toBe(70);

    await user.click(screen.getByRole('switch', { name: /Cardio/ }));
    expect(state().rule.activePillars).toEqual(['workouts']);
  });

  it('CPD-41 shows only the XP rules in a dates championship', () => {
    render(<Harness status="scheduled" showPillars={false} />);

    expect(screen.queryByRole('heading', { name: 'Pilares e pesos' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(6);
  });

  it('CPD-43 shows the lock notice and disables the rules while the championship runs', () => {
    render(<Harness status="active" />);

    expect(screen.getByRole('note')).toHaveTextContent('Não é possível alterar as regras com o campeonato em andamento.');
    XP_LABELS.forEach((label) => expect(screen.getByRole('spinbutton', { name: label })).toBeDisabled());
    within(screen.getByRole('heading', { name: 'Pilares e pesos' }).parentElement).getAllByRole('switch').forEach((toggle) => expect(toggle).toBeDisabled());
  });

  it.each(['completed', 'cancelled'])('CPD-43 keeps the rules of a %s championship disabled', (status) => {
    render(<Harness status={status} />);

    XP_LABELS.forEach((label) => expect(screen.getByRole('spinbutton', { name: label })).toBeDisabled());
  });
});
