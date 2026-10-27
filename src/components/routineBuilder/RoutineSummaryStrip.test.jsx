import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import RoutineSummaryStrip from './RoutineSummaryStrip';

// why: build n placeholder exercises so totals can be asserted without real data.
const makeExercises = (count, prefix) =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, name: `Ex ${prefix}${i}` }));

const SIX_TRAININGS = [
  { id: 't1', name: 'A', weekDay: 'monday', exercises: makeExercises(8, 'a') },
  { id: 't2', name: 'B', weekDay: 'wednesday', exercises: makeExercises(7, 'b') },
  { id: 't3', name: 'C', weekDay: 'friday', exercises: makeExercises(7, 'c') },
  { id: 't4', name: 'D', weekDay: null, exercises: makeExercises(7, 'd') },
  { id: 't5', name: 'E', weekDay: null, exercises: makeExercises(6, 'e') },
  { id: 't6', name: 'F', weekDay: null, exercises: makeExercises(6, 'f') },
];

// Renders the strip with the six-training fixture unless overridden.
const renderStrip = (props = {}) =>
  render(<RoutineSummaryStrip trainings={SIX_TRAININGS} onSelectTraining={vi.fn()} {...props} />);

// Returns the labelled summary region.
const getStrip = () => screen.getByRole('region', { name: 'Resumo da rotina' });

describe('RoutineSummaryStrip', () => {
  it('renders one labelled region with training, exercise and day totals', () => {
    renderStrip();
    const strip = getStrip();
    expect(within(strip).getByText('6 treinos')).toBeInTheDocument();
    expect(within(strip).getByText('41 exercícios')).toBeInTheDocument();
    expect(within(strip).getByText('3 de 6 com dia')).toBeInTheDocument();
  });

  it('uses singular forms for one training and one exercise', () => {
    renderStrip({ trainings: [{ id: 't1', weekDay: 'monday', exercises: makeExercises(1, 'x') }] });
    const strip = getStrip();
    expect(within(strip).getByText('1 treino')).toBeInTheDocument();
    expect(within(strip).getByText('1 exercício')).toBeInTheDocument();
    expect(within(strip).getByText('1 de 1 com dia')).toBeInTheDocument();
  });

  it('counts trainings with a day, not distinct days', () => {
    renderStrip({
      trainings: [
        { id: 't1', weekDay: 'monday', exercises: [] },
        { id: 't2', weekDay: 'monday', exercises: [] },
        { id: 't3', weekDay: null, exercises: [] },
      ],
    });
    expect(within(getStrip()).getByText('2 de 3 com dia')).toBeInTheDocument();
  });

  it('renders zero totals for an empty routine', () => {
    renderStrip({ trainings: [] });
    const strip = getStrip();
    expect(within(strip).getByText('0 treinos')).toBeInTheDocument();
    expect(within(strip).getByText('0 exercícios')).toBeInTheDocument();
  });

  it('renders the 7 day pills from Dom to Sáb', () => {
    renderStrip();
    const strip = getStrip();
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach((label) => {
      expect(within(strip).getByText(label)).toBeInTheDocument();
    });
  });

  it('makes only days that have a training interactive', () => {
    renderStrip();
    const strip = getStrip();
    expect(within(strip).getByRole('button', { name: /^Seg/ })).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: /^Qua/ })).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: /^Sex/ })).toBeInTheDocument();
    ['Dom', 'Ter', 'Qui', 'Sáb'].forEach((label) => {
      expect(within(strip).queryByRole('button', { name: new RegExp(`^${label}`) })).not.toBeInTheDocument();
    });
  });

  it('calls onSelectTraining with the training id when a day pill is clicked', async () => {
    const user = userEvent.setup();
    const onSelectTraining = vi.fn();
    renderStrip({ onSelectTraining });
    await user.click(within(getStrip()).getByRole('button', { name: /^Qua/ }));
    expect(onSelectTraining).toHaveBeenCalledWith('t2');
  });

  it('selects the first training of the day when several share it', async () => {
    const user = userEvent.setup();
    const onSelectTraining = vi.fn();
    renderStrip({
      onSelectTraining,
      trainings: [
        { id: 't1', weekDay: 'monday', exercises: [] },
        { id: 't2', weekDay: 'monday', exercises: [] },
      ],
    });
    await user.click(within(getStrip()).getByRole('button', { name: /^Seg/ }));
    expect(onSelectTraining).toHaveBeenCalledTimes(1);
    expect(onSelectTraining).toHaveBeenCalledWith('t1');
  });

  it('has no interactive day pills for an empty routine', () => {
    renderStrip({ trainings: [] });
    expect(within(getStrip()).queryAllByRole('button')).toHaveLength(0);
  });
});
