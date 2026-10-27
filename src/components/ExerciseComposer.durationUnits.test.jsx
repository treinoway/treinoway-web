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
const STRENGTH = { id: 'tmpl-strength', name: 'Prancha', type: 'strength' };

// Builds props with spies for every submit path.
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

// Switches the prescription to time mode.
const goToTimeMode = (user) => user.click(screen.getByRole('tab', { name: /Tempo/i }));

// True when `first` comes before `second` in the document.
const isBefore = (first, second) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('PrescriptionBand — field groups (criterion 25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('keeps the duration chips inside the Duração field, after its input', async () => {
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps()} />);
    await goToTimeMode(user);

    const input = screen.getByLabelText(/^Duração$/);
    const chips = screen.getByRole('group', { name: /Atalhos de duração/i });
    const field = input.closest('.prescription-row > div');
    expect(field).toContainElement(chips);
    expect(isBefore(input, chips)).toBe(true);
    expect(isBefore(chips, screen.getByLabelText(/Intervalo de descanso/i))).toBe(true);
  });

  it('puts the Descanso input before its chips, like Duração', () => {
    render(<ExerciseComposer {...buildProps()} />);
    const input = screen.getByLabelText(/Intervalo de descanso/i);
    const chips = screen.getByRole('group', { name: /Atalhos de descanso/i });
    expect(isBefore(input, chips)).toBe(true);
  });
});

describe('PrescriptionBand — cardio duration in minutes (criterion 25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('shows minute presets for a cardio pick and sends seconds in the payload', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps({ onSubmitFromTemplate })} />);
    await pick(user, 'corrida', /Corrida leve/i);
    await goToTimeMode(user);

    expect(screen.getByRole('button', { name: '10min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '45min' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '15s' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Duração$/), '20');
    expect(screen.getByLabelText(/^Duração$/)).toHaveValue(20);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate).toHaveBeenCalledWith(
      'tmpl-cardio',
      expect.objectContaining({ prescriptionMode: 'duration', duration: 1200 })
    );
  });

  it('a minute preset stores the matching seconds', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps({ onSubmitFromTemplate })} />);
    await pick(user, 'corrida', /Corrida leve/i);
    await goToTimeMode(user);

    await user.click(screen.getByRole('button', { name: '30min' }));
    expect(screen.getByLabelText(/^Duração$/)).toHaveValue(30);
    expect(screen.getByRole('button', { name: '30min' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate.mock.calls[0][1]).toEqual(expect.objectContaining({ duration: 1800 }));
  });

  it('keeps seconds and the second presets for a non-cardio exercise', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps({ onSubmitFromTemplate })} />);
    await pick(user, 'prancha', /Prancha/i);
    await goToTimeMode(user);

    await user.click(screen.getByRole('button', { name: '30s' }));
    expect(screen.getByLabelText(/^Duração$/)).toHaveValue(30);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate.mock.calls[0][1]).toEqual(expect.objectContaining({ duration: 30 }));
  });

  it('edit mode of a cardio exercise shows the stored seconds as minutes and saves seconds', async () => {
    const onSubmitEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <ExerciseComposer
        {...buildProps({
          onSubmitEdit,
          snapshot: { id: 'ex-1', name: 'Corrida', type: 'cardio', prescriptionMode: 'duration', duration: 1800, sets: 1 },
        })}
      />
    );

    expect(screen.getByLabelText(/^Duração$/)).toHaveValue(30);
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(onSubmitEdit).toHaveBeenCalledTimes(1));
    expect(onSubmitEdit).toHaveBeenCalledWith('ex-1', expect.objectContaining({ duration: 1800 }));
  });
});

describe('Single add — cardio defaults (criterion 25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('turns "Exercício com carga" off for a cardio pick and on for strength', async () => {
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps()} />);

    await pick(user, 'corrida', /Corrida leve/i);
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByLabelText(/Carga sugerida/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Trocar$/i }));
    await pick(user, 'prancha', /Prancha/i);
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the intensity status with a single "Selecionada:" prefix', async () => {
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps()} />);
    await pick(user, 'corrida', /Corrida leve/i);

    await user.click(screen.getByRole('radio', { name: 'Moderada' }));

    const status = screen.getByText(/Selecionada:/);
    expect(status.textContent.match(/Selecionada:/g)).toHaveLength(1);
    expect(status).not.toHaveTextContent(/Intensidade selecionada/i);
  });
});
