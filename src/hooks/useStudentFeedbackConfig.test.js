import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '../test/test-utils';
import useStudentFeedbackConfig from './useStudentFeedbackConfig';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const CONFIG_URL = '/trainer/student-feedbacks/config';
const SAVED = { autoSendEnabled: false, d7: true, d15: true, d21: true, d30: true, recurring: true };

let stored = SAVED;

// Routes the configuration requests; a save merges the sent fields into the in-memory configuration
const mockApi = () => {
  stored = { ...SAVED };
  api.get.mockImplementation((url) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: { ...stored } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.put.mockImplementation((url, changes) => {
    stored = { ...stored, ...changes };
    return Promise.resolve({ data: { ...stored } });
  });
};

// Renders the hook and waits for the saved configuration
const renderConfig = async () => {
  const view = renderHook(() => useStudentFeedbackConfig());
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockApi();
});

describe('useStudentFeedbackConfig: loading', () => {
  it('has no configuration and nothing to save while the request runs', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useStudentFeedbackConfig());

    expect(result.current.loading).toBe(true);
    expect(result.current.config).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('loads the saved configuration, clean', async () => {
    const { result } = await renderConfig();

    expect(api.get).toHaveBeenCalledWith(CONFIG_URL);
    expect(result.current.config).toEqual(SAVED);
    expect(result.current.error).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
  });

  it('exposes the API message and no configuration when the request fails, and recovers with reload', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar a configuração.' });
    const { result } = renderHook(() => useStudentFeedbackConfig());

    await waitFor(() => expect(result.current.error).toBe('Erro ao carregar a configuração.'));
    expect(result.current.config).toBeNull();
    expect(result.current.canSave).toBe(false);

    mockApi();
    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.config).toEqual(SAVED));
    expect(result.current.error).toBeNull();
  });

  it('keeps a field changed before the configuration arrived on top of the saved values', async () => {
    let answer;
    api.get.mockImplementation(() => new Promise((resolve) => {
      answer = resolve;
    }));
    const { result } = renderHook(() => useStudentFeedbackConfig());

    act(() => result.current.setField('d7', false));
    expect(result.current.config).toBeNull();
    expect(result.current.isDirty).toBe(false);
    await act(async () => {
      answer({ data: { ...SAVED } });
    });

    await waitFor(() => expect(result.current.config).toEqual({ ...SAVED, d7: false }));
    expect(result.current.isDirty).toBe(true);
  });
});

describe('useStudentFeedbackConfig: editing', () => {
  it('applies a changed field on top of the saved values and becomes dirty', async () => {
    const { result } = await renderConfig();

    act(() => result.current.setField('autoSendEnabled', true));

    expect(result.current.config).toEqual({ ...SAVED, autoSendEnabled: true });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSave).toBe(true);
    expect(api.put).not.toHaveBeenCalled();
  });

  it('is clean again when the field goes back to the saved value', async () => {
    const { result } = await renderConfig();

    act(() => result.current.setField('d15', false));
    act(() => result.current.setField('d15', true));

    expect(result.current.config).toEqual(SAVED);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
  });

  it('stays clean when a field is set to the value it already has', async () => {
    const { result } = await renderConfig();

    act(() => result.current.setField('d7', true));

    expect(result.current.isDirty).toBe(false);
  });
});

describe('useStudentFeedbackConfig: saving', () => {
  it('sends only the fields that differ from the saved configuration', async () => {
    const { result } = await renderConfig();
    act(() => result.current.setField('autoSendEnabled', true));
    act(() => result.current.setField('d21', false));
    act(() => result.current.setField('d30', false));
    act(() => result.current.setField('d30', true));

    await act(() => result.current.save());

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith(CONFIG_URL, { autoSendEnabled: true, d21: false });
  });

  it('adopts the configuration the service answers and becomes clean', async () => {
    api.put.mockResolvedValue({ data: { ...SAVED, autoSendEnabled: true, recurring: false } });
    const { result } = await renderConfig();
    act(() => result.current.setField('autoSendEnabled', true));

    await act(() => result.current.save());

    expect(result.current.config).toEqual({ ...SAVED, autoSendEnabled: true, recurring: false });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('compares the next change against the newly saved values', async () => {
    const { result } = await renderConfig();
    act(() => result.current.setField('autoSendEnabled', true));
    await act(() => result.current.save());

    act(() => result.current.setField('autoSendEnabled', false));
    expect(result.current.isDirty).toBe(true);
    await act(() => result.current.save());

    expect(api.put).toHaveBeenLastCalledWith(CONFIG_URL, { autoSendEnabled: false });
    expect(result.current.config).toEqual(SAVED);
  });

  it('reports saving and blocks another save while the request runs', async () => {
    let finishSave;
    api.put.mockImplementation(() => new Promise((resolve) => {
      finishSave = resolve;
    }));
    const { result } = await renderConfig();
    act(() => result.current.setField('d7', false));

    let saving;
    act(() => {
      saving = result.current.save();
    });

    expect(result.current.saving).toBe(true);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSave).toBe(false);
    await act(async () => {
      finishSave({ data: { ...SAVED, d7: false } });
      await saving;
    });
    expect(result.current.saving).toBe(false);
    expect(result.current.config.d7).toBe(false);
  });

  it('rejects with the API error and keeps the unsaved change when the save fails', async () => {
    const failure = { userMessage: 'Erro ao salvar a configuração.' };
    api.put.mockRejectedValue(failure);
    const { result } = await renderConfig();
    act(() => result.current.setField('d7', false));

    let caught;
    await act(async () => {
      caught = await result.current.save().catch((error) => error);
    });

    expect(caught).toBe(failure);
    expect(result.current.config).toEqual({ ...SAVED, d7: false });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.saving).toBe(false);
    expect(result.current.canSave).toBe(true);
  });
});
