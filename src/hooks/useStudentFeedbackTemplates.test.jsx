import { describe, it, expect, vi, beforeEach } from 'vitest';
import PropTypes from 'prop-types';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, renderHook, screen, waitFor } from '../test/test-utils';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast }),
}));

import api from '../api/axios';
import useStudentFeedbackTemplates, { useDuplicateStudentFeedbackTemplate, useStudentFeedbackTemplateOptions } from './useStudentFeedbackTemplates';

const TEMPLATES_URL = '/trainer/student-feedbacks/templates';
const START_PATH = '/trainer/student-feedbacks/templates';

const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7', 'D15'] };
const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 5, milestones: ['D30'] };
const QUICK = { id: 'tpl-5', name: 'Check rápido', isGeneral: false, version: 1, questionCount: 1, milestones: [] };
const COPY = { id: 'tpl-new', name: 'Padrão TeuFit (cópia)', isGeneral: false, version: 1, hasRequests: false, milestones: [], questions: [] };

let templates = [];

// Routes the requests by URL; deleting removes the template and hands its milestones to the general one, as the service does
const mockApi = (items = [MONTHLY, GENERAL, QUICK]) => {
  templates = [...items];
  api.get.mockImplementation((url) => {
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.post.mockImplementation(() => Promise.resolve({ status: 201, data: { template: COPY } }));
  api.delete.mockImplementation((url) => {
    const deleted = templates.find((template) => `${TEMPLATES_URL}/${template.id}` === url);
    templates = templates
      .filter((template) => template !== deleted)
      .map((template) => (template.isGeneral ? { ...template, milestones: [...template.milestones, ...deleted.milestones] } : template));
    return Promise.resolve({ status: 204, data: '' });
  });
};

// Shows the current path so a test can tell where the hook navigated to
const CurrentPath = () => <p>{`rota: ${useLocation().pathname}`}</p>;

// Router around the hook, starting on the template list
const RouterWrapper = ({ children }) => (
  <MemoryRouter initialEntries={[START_PATH]}>
    <CurrentPath />
    {children}
  </MemoryRouter>
);

RouterWrapper.propTypes = { children: PropTypes.node };

// The ids of the templates the hook exposes, in order
const idsOf = (list) => list.map((template) => template.id);

beforeEach(() => {
  vi.clearAllMocks();
  mockApi();
});

// Renders the list hook and waits for the first load to settle
const renderList = async () => {
  const view = renderHook(() => useStudentFeedbackTemplates(), { wrapper: RouterWrapper });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
};

// Renders the duplicate hook inside the router
const renderDuplicate = () => renderHook(() => useDuplicateStudentFeedbackTemplate(), { wrapper: RouterWrapper });

describe('useStudentFeedbackTemplates', () => {
  it('is loading with no template and no error while the request runs', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useStudentFeedbackTemplates(), { wrapper: RouterWrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.templates).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('loads the templates with the general one first', async () => {
    const { result } = await renderList();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL);
    expect(idsOf(result.current.templates)).toEqual(['tpl-general', 'tpl-2', 'tpl-5']);
    expect(result.current.error).toBeNull();
  });

  it('exposes the API message and no template when the request fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar os modelos.' });
    const { result } = await renderList();

    expect(result.current.error).toBe('Erro ao carregar os modelos.');
    expect(result.current.templates).toEqual([]);
  });

  it('loads again on reload, clearing the error while it runs', async () => {
    api.get.mockRejectedValueOnce({ userMessage: 'Erro ao carregar os modelos.' });
    const { result } = await renderList();
    expect(result.current.error).toBe('Erro ao carregar os modelos.');

    act(() => {
      result.current.reload();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(idsOf(result.current.templates)).toEqual(['tpl-general', 'tpl-2', 'tpl-5']);
    expect(result.current.error).toBeNull();
  });

  it('deletes the template, takes it off the list and refreshes the milestones of the general one without a loading state', async () => {
    const { result } = await renderList();
    const loadingStates = [];

    await act(async () => {
      const pending = result.current.remove('tpl-2');
      loadingStates.push(result.current.loading);
      await pending;
    });
    loadingStates.push(result.current.loading);

    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.delete).toHaveBeenCalledWith(`${TEMPLATES_URL}/tpl-2`);
    expect(idsOf(result.current.templates)).toEqual(['tpl-general', 'tpl-5']);
    expect(result.current.templates[0].milestones).toEqual(['D7', 'D15', 'D30']);
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(loadingStates).toEqual([false, false]);
  });

  it('rejects with the API error and keeps the list when the delete fails', async () => {
    const failure = { userMessage: 'Modelo de feedback não encontrado.' };
    api.delete.mockRejectedValue(failure);
    const { result } = await renderList();

    let caught;
    await act(async () => {
      caught = await result.current.remove('tpl-2').catch((error) => error);
    });

    expect(caught).toBe(failure);
    expect(idsOf(result.current.templates)).toEqual(['tpl-general', 'tpl-2', 'tpl-5']);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('keeps the list without the deleted template when the refresh after the delete fails', async () => {
    const { result } = await renderList();
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar os modelos.' });

    await act(async () => {
      await result.current.remove('tpl-2');
    });

    expect(idsOf(result.current.templates)).toEqual(['tpl-general', 'tpl-5']);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe('useDuplicateStudentFeedbackTemplate', () => {
  it('is idle and requests nothing until asked', () => {
    const { result } = renderDuplicate();

    expect(result.current.duplicating).toBe(false);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('copies the template with one POST and opens the copy in the builder', async () => {
    const { result } = renderDuplicate();

    await act(async () => {
      await result.current.duplicate('tpl-general');
    });

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(`${TEMPLATES_URL}/tpl-general/duplicate`);
    expect(screen.getByText(`rota: ${TEMPLATES_URL}/tpl-new`)).toBeInTheDocument();
    expect(result.current.duplicating).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('is duplicating while the request runs', async () => {
    let answer;
    api.post.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
    const { result } = renderDuplicate();

    let pending;
    act(() => {
      pending = result.current.duplicate('tpl-2');
    });
    expect(result.current.duplicating).toBe(true);

    await act(async () => {
      answer({ status: 201, data: { template: COPY } });
      await pending;
    });
    expect(result.current.duplicating).toBe(false);
  });

  it('shows the API message as an error toast and stays where it was when the copy fails', async () => {
    api.post.mockRejectedValue({ userMessage: 'Não foi possível duplicar o modelo.' });
    const { result } = renderDuplicate();

    await act(async () => {
      await result.current.duplicate('tpl-general');
    });

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('Não foi possível duplicar o modelo.', 'error');
    expect(screen.getByText(`rota: ${START_PATH}`)).toBeInTheDocument();
    expect(result.current.duplicating).toBe(false);
  });
});

describe('useStudentFeedbackTemplateOptions', () => {
  it('has no option while the list loads', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useStudentFeedbackTemplateOptions());

    expect(result.current).toEqual([]);
  });

  it('answers the templates with the general one first', async () => {
    const { result } = renderHook(() => useStudentFeedbackTemplateOptions());

    await waitFor(() => expect(idsOf(result.current)).toEqual(['tpl-general', 'tpl-2', 'tpl-5']));
    expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL);
  });

  it('has no option, without throwing, when the list fails to load', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar os modelos.' });
    const { result } = renderHook(() => useStudentFeedbackTemplateOptions());

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    await act(async () => {});

    expect(result.current).toEqual([]);
  });
});
