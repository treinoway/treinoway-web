import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import ActivitiesCard from './ActivitiesCard';
import { buildGoals } from '../../test/nutritionFixtures';

// Test helper: renders the card with the fixture activities.
const renderCard = (props = {}) => render(
  <ActivitiesCard activities={buildGoals().activities} weightKg={66} trainerName="José" onChange={vi.fn()} {...props} />,
);

describe('ActivitiesCard', () => {
  it('summarises each activity and marks the one from training', () => {
    renderCard();
    const training = screen.getByText('Musculação').closest('li');
    expect(within(training).getByText('4×/semana · 60 min · MET 5,0')).toBeInTheDocument();
    expect(within(training).getByText('+189 kcal/dia')).toBeInTheDocument();
    expect(screen.getByText('Do treino do José no TeuFit')).toBeInTheDocument();
    expect(screen.getByText('Atividades físicas · METs')).toBeInTheDocument();
  });

  it('falls back to a generic origin label without the trainer name', () => {
    renderCard({ trainerName: undefined });
    expect(screen.getByText('Do treino no TeuFit')).toBeInTheDocument();
  });

  it('hides the origin badge when no activity comes from the training', () => {
    renderCard({ activities: buildGoals().activities.filter((activity) => !activity.fromTraining) });
    expect(screen.queryByText(/Do treino/)).not.toBeInTheDocument();
  });

  it('toggles inclusion through onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderCard({ onChange });
    await user.click(screen.getByRole('checkbox', { name: 'Incluir Caminhada no cálculo' }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Musculação', included: true }),
      expect.objectContaining({ name: 'Caminhada', included: false }),
    ]);
  });

  it('only manual activities can be removed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderCard({ onChange });
    expect(screen.queryByRole('button', { name: 'Remover Musculação' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remover Caminhada' }));
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: 'Musculação' })]);
  });

  it('keeps "Salvar atividade" disabled until the form is valid, then adds the activity', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderCard({ onChange });
    await user.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
    expect(screen.getByRole('button', { name: 'Salvar atividade' })).toBeDisabled();

    await user.type(screen.getByLabelText('Nome da atividade'), 'Corrida');
    await user.type(screen.getByLabelText('MET'), '8');
    await user.type(screen.getByLabelText('Minutos por sessão'), '30');
    await user.type(screen.getByLabelText('Sessões por semana'), '2');
    await user.click(screen.getByRole('button', { name: 'Salvar atividade' }));

    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining([
      { name: 'Corrida', met: 8, minutes: 30, perWeek: 2, included: true, fromTraining: false },
    ]));
    expect(screen.queryByLabelText('Nome da atividade')).not.toBeInTheDocument();
  });

  it('cancels the form without changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderCard({ onChange });
    await user.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Adicionar atividade' })).toBeInTheDocument();
  });
});
