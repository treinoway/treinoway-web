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

// why: real ExerciseTemplate rows only carry id, name, type and videoUrl (no prescription).
const BARE_TEMPLATE = { id: 'tmpl-bare', name: 'Agachamento livre', type: 'strength' };

const baseProps = {
  snapshot: null,
  exerciseTemplates: [BARE_TEMPLATE],
  saving: false,
  onSubmitCreate: vi.fn(),
  onSubmitEdit: vi.fn(),
  onSubmitFromLibrary: vi.fn(),
  onSubmitFromTemplate: vi.fn(),
  onCancel: vi.fn(),
};

// Renders the composer in create mode with a bare template.
const renderComposer = (props = {}) => render(<ExerciseComposer {...baseProps} {...props} />);

// Searches for the bare template and picks it.
const pickBare = async (user) => {
  await user.type(screen.getByRole('combobox', { name: /Buscar na biblioteca/i }), 'agacha');
  await user.click(await screen.findByRole('option', { name: /Agachamento livre/i }));
};

describe('ExerciseComposer — single add with a bare template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('empty volume: asks for confirmation, then sends no prescriptionMode', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await pickBare(user);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
    expect(onSubmitFromTemplate).not.toHaveBeenCalled();
    const alert = await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: /Salvar mesmo assim/i }));

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(alert).not.toBeInTheDocument();
    const [templateId, overrides] = onSubmitFromTemplate.mock.calls[0];
    expect(templateId).toBe('tmpl-bare');
    expect(overrides).not.toHaveProperty('prescriptionMode');
    expect(overrides).not.toHaveProperty('repetitions');
    expect(overrides).not.toHaveProperty('duration');
  });

  it('empty volume: "Voltar e preencher" keeps the composer without saving', async () => {
    const onSubmitFromTemplate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await pickBare(user);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
    await user.click(await screen.findByRole('button', { name: /Voltar e preencher/i }));

    expect(onSubmitFromTemplate).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('filled reps: saves directly with prescriptionMode "reps" and the repetitions', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await pickBare(user);
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onSubmitFromTemplate).toHaveBeenCalledWith(
      'tmpl-bare',
      expect.objectContaining({ prescriptionMode: 'reps', repetitions: { min: 8, max: 12 } })
    );
  });

  it('filled duration in time mode: sends prescriptionMode "duration" with the duration', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await pickBare(user);
    await user.click(screen.getByRole('tab', { name: /Tempo/i }));
    await user.type(screen.getByLabelText(/^Duração$/), '45');

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate).toHaveBeenCalledWith(
      'tmpl-bare',
      expect.objectContaining({ prescriptionMode: 'duration', duration: 45 })
    );
  });

  it('only a minimum filled: shows an inline error and does not save or confirm', async () => {
    const onSubmitFromTemplate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await pickBare(user);
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/mínimas e máximas/i);
    expect(onSubmitFromTemplate).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

// Picks the bare template, fills reps and clicks save.
describe('ExerciseComposer — single add save errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  const fillAndSave = async (user) => {
    await pickBare(user);
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
  };

  it('shows the API message in an alert and keeps the form', async () => {
    const onSubmitFromTemplate = vi.fn().mockRejectedValue({ userMessage: 'Treino não encontrado.' });
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });

    await fillAndSave(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Treino não encontrado.');
    expect(screen.getByRole('button', { name: /Salvar exercício/i })).toBeEnabled();
    expect(screen.getByLabelText(/Repetições mínimas/i)).toHaveValue(8);
  });

  it('clears the error when saving again', async () => {
    const onSubmitFromTemplate = vi
      .fn()
      .mockRejectedValueOnce({ userMessage: 'Falhou.' })
      .mockResolvedValueOnce({});
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await fillAndSave(user);
    await screen.findByText('Falhou.');

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(screen.queryByText('Falhou.')).not.toBeInTheDocument());
  });

  it('logs and shows a generic message for an unexpected error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSubmitFromTemplate = vi.fn().mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });

    await fillAndSave(user);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const OTHER_YT = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
const VIDEO_TEMPLATE = { id: 'tmpl-video', name: 'Agachamento livre', type: 'strength', videoUrl: YT, gifUrl: '' };

// Picks the template, fills reps and saves.
const pickFillSave = async (user) => {
  await pickBare(user);
  await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
  await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
  await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
};

describe('ExerciseComposer — single add video section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('shows the video section before and after a template is picked', async () => {
    const user = userEvent.setup();
    renderComposer();
    expect(screen.getByText('Vídeo de demonstração')).toBeInTheDocument();
    await pickBare(user);
    expect(screen.getByText('Vídeo de demonstração')).toBeInTheDocument();
  });

  it('keeps a URL typed before picking and sends it as an override', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderComposer({ exerciseTemplates: [VIDEO_TEMPLATE], onSubmitFromTemplate });
    await user.click(screen.getByLabelText('URL do YouTube'));
    await user.paste(OTHER_YT);
    await pickFillSave(user);

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate.mock.calls[0][1]).toEqual(expect.objectContaining({ videoUrl: OTHER_YT }));
  });

  it('prefills the video from the template and omits it when unchanged', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderComposer({ exerciseTemplates: [VIDEO_TEMPLATE], onSubmitFromTemplate });
    await pickFillSave(user);

    expect(screen.getByTitle(/Vídeo de demonstração do exercício/i)).toBeInTheDocument();
    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    const overrides = onSubmitFromTemplate.mock.calls[0][1];
    expect(overrides).not.toHaveProperty('videoUrl');
    expect(overrides).not.toHaveProperty('gifUrl');
  });

  it('sends a changed video URL as an override', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await pickBare(user);
    await user.click(screen.getByLabelText('URL do YouTube'));
    await user.paste(YT);
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate.mock.calls[0][1]).toEqual(expect.objectContaining({ videoUrl: YT }));
  });

  it('sends null when the inherited video is removed', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderComposer({ exerciseTemplates: [VIDEO_TEMPLATE], onSubmitFromTemplate });
    await pickBare(user);
    await user.click(screen.getByRole('button', { name: /Remover/i }));
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate.mock.calls[0][1]).toEqual(expect.objectContaining({ videoUrl: null }));
  });

  it('blocks saving on an invalid GIF link', async () => {
    const onSubmitFromTemplate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await pickBare(user);
    await user.type(screen.getByLabelText('Link do GIF'), 'not-a-url');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    expect(onSubmitFromTemplate).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
