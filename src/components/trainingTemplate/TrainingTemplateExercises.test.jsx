import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
vi.mock('../../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

import TrainingTemplateExercises from './TrainingTemplateExercises';

const available = [
  { id: 20, name: 'Supino Reto', type: 'strength' },
  { id: 21, name: 'Corrida', type: 'cardio' },
];

const renderSection = (props = {}) => {
  const handlers = { onAdd: vi.fn(), onRemove: vi.fn(), onEdit: vi.fn(), onCreateNew: vi.fn() };
  render(
    <TrainingTemplateExercises
      exerciseIds={[]}
      junctions={[]}
      availableExercises={available}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

describe('TrainingTemplateExercises', () => {
  it('adds an exercise as soon as it is picked from the combobox', async () => {
    const user = userEvent.setup();
    const { onAdd } = renderSection();
    expect(screen.queryByRole('button', { name: /adicionar exercício ao treino/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Adicionar exercício' }));
    await user.click(screen.getByRole('option', { name: /supino reto/i }));

    expect(onAdd).toHaveBeenCalledWith(available[0]);
    expect(screen.getByRole('status')).toHaveTextContent('Supino Reto adicionado ao treino');
    expect(screen.getByRole('combobox', { name: 'Adicionar exercício' })).toHaveFocus();
  });

  it('shows the exercise count next to the section title only when there are exercises', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: /exercícios do treino/i }).parentElement).toHaveTextContent(/^Exercícios do treino$/);
  });

  it('shows the count badge for the listed exercises', () => {
    renderSection({ exerciseIds: [20, 21] });
    expect(screen.getByRole('heading', { name: /exercícios do treino/i }).parentElement).toHaveTextContent('2');
  });

  it('lists the exercises, opens one for editing and removes via the row menu', async () => {
    const user = userEvent.setup();
    const { onEdit, onRemove } = renderSection({ exerciseIds: [20] });

    await user.click(screen.getByRole('button', { name: 'Editar exercício Supino Reto' }));
    expect(onEdit).toHaveBeenCalledWith(20);

    await user.click(screen.getByRole('button', { name: 'Ações do exercício Supino Reto' }));
    await user.click(screen.getByRole('button', { name: /remover/i }));
    expect(onRemove).toHaveBeenCalledWith(20);
  });

  it('asks to create a new exercise', async () => {
    const { onCreateNew } = renderSection();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Criar novo exercício' }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('shows the exercise type in the options', async () => {
    const user = userEvent.setup();
    renderSection({ availableExercises: [{ id: 30, name: 'Esteira', type: 'cardio', typeLabel: 'Cardio' }] });
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: /esteira/i })).toHaveTextContent('Cardio');
  });

  it('marks exercises already in the training as added', async () => {
    const user = userEvent.setup();
    renderSection({ exerciseIds: [20] });
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: /supino reto/i })).toHaveAttribute('aria-disabled', 'true');
  });
});
