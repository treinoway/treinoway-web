import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseComposer from './ExerciseComposer';

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '../api/axios';

const CARDIO = { id: 'tmpl-cardio', name: 'Corrida leve', type: 'cardio' };
const STRENGTH = { id: 'tmpl-strength', name: 'Supino reto', type: 'strength' };

// Builds props with spies for the from-template path.
const buildProps = (extra = {}) => ({
  snapshot: null,
  exerciseTemplates: [CARDIO, STRENGTH],
  saving: false,
  onSubmitCreate: vi.fn(),
  onSubmitEdit: vi.fn(),
  onSubmitFromLibrary: vi.fn(),
  onSubmitFromTemplate: vi.fn().mockResolvedValue({}),
  onCancel: vi.fn(),
  ...extra,
});

// Searches and picks an exercise by query and option name.
const pick = async (user, query, name) => {
  await user.type(screen.getByRole('combobox', { name: /Buscar na biblioteca/i }), query);
  await user.click(await screen.findByRole('option', { name }));
};

// Fills reps so saving does not trigger the empty-prescription confirm.
const fillReps = async (user) => {
  await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
  await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
};

describe('ExerciseComposer — intensity in the single add (criterion 24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('hides intensity before a pick and for a strength exercise', async () => {
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps()} />);
    expect(screen.queryByRole('radiogroup', { name: /Intensidade/i })).not.toBeInTheDocument();

    await pick(user, 'supino', /Supino reto/i);

    expect(screen.queryByRole('radiogroup', { name: /Intensidade/i })).not.toBeInTheDocument();
  });

  it('shows the intensity control after picking a cardio exercise', async () => {
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps()} />);

    await pick(user, 'corrida', /Corrida leve/i);

    expect(screen.getByRole('radiogroup', { name: /Intensidade/i })).toBeInTheDocument();
  });

  it('sends the chosen intensity in the overrides', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps({ onSubmitFromTemplate })} />);
    await pick(user, 'corrida', /Corrida leve/i);
    await user.click(screen.getByRole('radio', { name: 'Moderada' }));
    await fillReps(user);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate).toHaveBeenCalledWith('tmpl-cardio', expect.objectContaining({ intensity: 'moderate' }));
  });

  it('sends no intensity key when none is chosen', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps({ onSubmitFromTemplate })} />);
    await pick(user, 'corrida', /Corrida leve/i);
    await fillReps(user);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate.mock.calls[0][1]).not.toHaveProperty('intensity');
  });

  it('clears the intensity on Trocar to a non-cardio exercise', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps({ onSubmitFromTemplate })} />);
    await pick(user, 'corrida', /Corrida leve/i);
    await user.click(screen.getByRole('radio', { name: 'Moderada' }));

    await user.click(screen.getByRole('button', { name: /^Trocar$/i }));
    await pick(user, 'supino', /Supino reto/i);

    expect(screen.queryByRole('radiogroup', { name: /Intensidade/i })).not.toBeInTheDocument();
    await fillReps(user);
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate.mock.calls[0][1]).not.toHaveProperty('intensity');
  });
});
