import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '../test/test-utils';
import useStudentFeedbackMilestoneTemplates from './useStudentFeedbackMilestoneTemplates';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const TEMPLATES_URL = '/trainer/student-feedbacks/templates';
const MILESTONE_TEMPLATES_URL = '/trainer/student-feedbacks/milestone-templates';
const FIELDS = ['d7', 'd15', 'd21', 'd30', 'recurring'];

const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7', 'D15', 'D21'] };
const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 5, milestones: ['D30'] };
const QUICK = { id: 'tpl-5', name: 'Check rápido', isGeneral: false, version: 1, questionCount: 1, milestones: ['RECURRING'] };
const SAVED = { d7: null, d15: null, d21: null, d30: 'tpl-2', recurring: 'tpl-5' };

let stored = SAVED;

// Routes the template list and the milestone map by URL; a save merges the sent milestones into the in-memory map
const mockApi = ({ templates = [MONTHLY, GENERAL, QUICK], saved = SAVED } = {}) => {
  stored = { ...saved };
  api.get.mockImplementation((url) => {
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates } });
    if (url === MILESTONE_TEMPLATES_URL) return Promise.resolve({ data: { milestoneTemplates: { ...stored } } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.put.mockImplementation((url, changes) => {
    stored = { ...stored, ...changes };
    return Promise.resolve({ data: { milestoneTemplates: { ...stored } } });
  });
};

// Renders the hook and waits for the templates and the saved milestones
const renderMilestoneTemplates = async () => {
  const view = renderHook(() => useStudentFeedbackMilestoneTemplates());
  await waitFor(() => expect(view.result.current.available).toBe(true));
  return view;
};

// The template shown for each milestone
const valuesOf = (result) => Object.fromEntries(FIELDS.map((field) => [field, result.current.valueOf(field)]));

beforeEach(() => {
  vi.clearAllMocks();
  mockApi();
});

describe('useStudentFeedbackMilestoneTemplates: loading', () => {
  it('is not available, has no template and nothing to save while the requests run', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useStudentFeedbackMilestoneTemplates());

    expect(result.current.available).toBe(false);
    expect(result.current.templates).toEqual([]);
    expect(result.current.valueOf('d7')).toBe('');
    expect(result.current.isDirty).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('loads the templates, general first, and the template saved for each milestone', async () => {
    const { result } = await renderMilestoneTemplates();

    expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL);
    expect(api.get).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL);
    expect(result.current.templates.map((template) => template.id)).toEqual(['tpl-general', 'tpl-2', 'tpl-5']);
    expect(valuesOf(result)).toEqual({ d7: 'tpl-general', d15: 'tpl-general', d21: 'tpl-general', d30: 'tpl-2', recurring: 'tpl-5' });
    expect(result.current.isDirty).toBe(false);
  });

  it('stays unavailable without throwing when the template list fails to load', async () => {
    api.get.mockImplementation((url) => {
      if (url === MILESTONE_TEMPLATES_URL) return Promise.resolve({ data: { milestoneTemplates: SAVED } });
      return Promise.reject({ userMessage: 'Erro ao carregar os modelos.' });
    });
    const { result } = renderHook(() => useStudentFeedbackMilestoneTemplates());

    await waitFor(() => expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL));
    await act(async () => {});

    expect(result.current.available).toBe(false);
    expect(result.current.templates).toEqual([]);
    expect(result.current.isDirty).toBe(false);
  });

  it('stays unavailable without throwing when the saved milestones fail to load', async () => {
    api.get.mockImplementation((url) => {
      if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates: [GENERAL, MONTHLY] } });
      return Promise.reject({ userMessage: 'Erro ao carregar os marcos.' });
    });
    const { result } = renderHook(() => useStudentFeedbackMilestoneTemplates());

    await waitFor(() => expect(api.get).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL));
    await act(async () => {});

    expect(result.current.available).toBe(false);
    expect(result.current.templates).toEqual([]);
  });

  it('never reports a change picked while the load failed', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar os modelos.' });
    const { result } = renderHook(() => useStudentFeedbackMilestoneTemplates());
    await act(async () => {});

    act(() => result.current.pick('d7', 'tpl-2'));

    expect(result.current.available).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('shows the general template for a saved id that is not in the template list', async () => {
    mockApi({ saved: { ...SAVED, d15: 'tpl-deleted' } });
    const { result } = await renderMilestoneTemplates();

    expect(result.current.valueOf('d15')).toBe('tpl-general');
    expect(result.current.isDirty).toBe(false);
  });

  it('shows an empty value when neither the saved template nor a general one is in the list', async () => {
    mockApi({ templates: [MONTHLY], saved: { ...SAVED, d7: null } });
    const { result } = await renderMilestoneTemplates();

    expect(result.current.valueOf('d7')).toBe('');
    expect(result.current.valueOf('d30')).toBe('tpl-2');
  });
});

describe('useStudentFeedbackMilestoneTemplates: picking', () => {
  it('shows the picked template and reports the change', async () => {
    const { result } = await renderMilestoneTemplates();

    act(() => result.current.pick('d7', 'tpl-5'));

    expect(result.current.valueOf('d7')).toBe('tpl-5');
    expect(result.current.valueOf('d15')).toBe('tpl-general');
    expect(result.current.isDirty).toBe(true);
    expect(api.put).not.toHaveBeenCalled();
  });

  it('clears the change when the saved template is picked back', async () => {
    const { result } = await renderMilestoneTemplates();

    act(() => result.current.pick('d30', 'tpl-5'));
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.pick('d30', 'tpl-2'));
    expect(result.current.valueOf('d30')).toBe('tpl-2');
    expect(result.current.isDirty).toBe(false);
  });

  it('clears the change when a milestone on the general template is put back on it', async () => {
    const { result } = await renderMilestoneTemplates();

    act(() => result.current.pick('d7', 'tpl-2'));
    act(() => result.current.pick('d7', 'tpl-general'));

    expect(result.current.valueOf('d7')).toBe('tpl-general');
    expect(result.current.isDirty).toBe(false);
  });

  it('does not report a change when the general template is picked for a milestone already on it', async () => {
    const { result } = await renderMilestoneTemplates();

    act(() => result.current.pick('d15', 'tpl-general'));

    expect(result.current.isDirty).toBe(false);
  });
});

describe('useStudentFeedbackMilestoneTemplates: saving', () => {
  it('sends only the changed milestone in one PUT', async () => {
    const { result } = await renderMilestoneTemplates();
    act(() => result.current.pick('d7', 'tpl-5'));

    await act(async () => {
      await result.current.save();
    });

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL, { d7: 'tpl-5' });
  });

  it('sends null when the general template is picked for a milestone that had its own', async () => {
    const { result } = await renderMilestoneTemplates();
    act(() => result.current.pick('d30', 'tpl-general'));
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(api.put).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL, { d30: null });
    expect(result.current.valueOf('d30')).toBe('tpl-general');
  });

  it('sends every changed milestone and leaves out one that was picked back', async () => {
    const { result } = await renderMilestoneTemplates();
    act(() => result.current.pick('d7', 'tpl-2'));
    act(() => result.current.pick('d15', 'tpl-5'));
    act(() => result.current.pick('recurring', 'tpl-general'));
    act(() => result.current.pick('d15', 'tpl-general'));

    await act(async () => {
      await result.current.save();
    });

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL, { d7: 'tpl-2', recurring: null });
  });

  it('takes the answered map as the saved state and has nothing left to save', async () => {
    const { result } = await renderMilestoneTemplates();
    act(() => result.current.pick('d7', 'tpl-5'));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(valuesOf(result)).toEqual({ d7: 'tpl-5', d15: 'tpl-general', d21: 'tpl-general', d30: 'tpl-2', recurring: 'tpl-5' });

    act(() => result.current.pick('d7', 'tpl-general'));
    expect(result.current.isDirty).toBe(true);
  });

  it('does not load the templates again after a save', async () => {
    const { result } = await renderMilestoneTemplates();
    const loads = api.get.mock.calls.length;
    act(() => result.current.pick('d7', 'tpl-5'));

    await act(async () => {
      await result.current.save();
    });

    expect(api.get).toHaveBeenCalledTimes(loads);
  });

  it('is saving while the request runs', async () => {
    let answer;
    api.put.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
    const { result } = await renderMilestoneTemplates();
    act(() => result.current.pick('d7', 'tpl-5'));

    let pending;
    act(() => {
      pending = result.current.save();
    });
    expect(result.current.saving).toBe(true);

    await act(async () => {
      answer({ data: { milestoneTemplates: { ...SAVED, d7: 'tpl-5' } } });
      await pending;
    });
    expect(result.current.saving).toBe(false);
  });

  it('rejects with the API error and keeps the picks when the save fails', async () => {
    const failure = { userMessage: 'Modelo de feedback não encontrado.' };
    api.put.mockRejectedValue(failure);
    const { result } = await renderMilestoneTemplates();
    act(() => result.current.pick('d7', 'tpl-5'));

    let caught;
    await act(async () => {
      caught = await result.current.save().catch((error) => error);
    });

    expect(caught).toBe(failure);
    expect(result.current.saving).toBe(false);
    expect(result.current.valueOf('d7')).toBe('tpl-5');
    expect(result.current.isDirty).toBe(true);
  });
});
