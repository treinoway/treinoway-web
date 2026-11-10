import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, renderWithRoute } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import api from '../../api/axios';

// Template-biset AC 9-12, 14: bi-sets in the training-template builder
// (/trainer/routines/:id/edit). Real useRoutineBuilder + useBisetCreate run on
// top of a mocked axios, so the assertions pin the exact endpoints used.

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../hooks/useRoutineDraft', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useProtocolDraft', () => ({ default: vi.fn() }));

import useRoutineDraft from '../../hooks/useRoutineDraft';
import useProtocolDraft from '../../hooks/useProtocolDraft';
import { useToast } from '../../contexts/ToastContext';
import RoutineBuilder from './RoutineBuilder';

// jsdom lacks IntersectionObserver; this no-op stands in for it.
class NoopIntersectionObserver {
  // why: required by the builder on mount, nothing to observe in tests.
  observe() {}
  // why: counterpart of observe, intentionally empty.
  disconnect() {}
}

const mockShowToast = vi.fn();

const ROUTINE_ID = 'rt-1';
const TRAINING_ID = 't1';
const GROUP_ID = 'g-1';
const TEMPLATE_URL = `/trainer/training-templates/${TRAINING_ID}`;

// Builds a training-template junction row as the backend returns it.
const junction = (id, name, order, extra = {}) => ({
  id,
  name,
  order,
  type: 'strength',
  sets: 3,
  repetitions: { min: 8, max: 12 },
  restInterval: 60,
  hasLoad: true,
  supersetGroupId: null,
  supersetOrder: 0,
  supersetRestInterval: null,
  ...extra,
});

// Builds a junction row that belongs to the shared bi-set group.
const grouped = (id, name, order, supersetOrder) =>
  junction(id, name, order, {
    supersetGroupId: GROUP_ID,
    supersetOrder,
    supersetRestInterval: 90,
  });

const UNGROUPED = [junction('j1', 'Supino reto', 0), junction('j2', 'Rosca direta', 1), junction('j3', 'Agachamento livre', 2)];
const GROUPED_PAIR = [grouped('j1', 'Supino reto', 0, 0), grouped('j2', 'Rosca direta', 1, 1)];

let serverExercises;

// Wires axios: GET serves `serverExercises` for both the initial load and the refetch.
const mockServer = (initial) => {
  serverExercises = initial;
  api.get.mockImplementation((url) => {
    if (url === `/trainer/protocol-templates/${ROUTINE_ID}`) {
      return Promise.resolve({
        data: {
          id: ROUTINE_ID,
          name: 'Rotina',
          trainings: [
            {
              id: TRAINING_ID,
              name: 'Treino A',
              category: 'strength',
              weekDay: 'monday',
              trainingTemplateExerciseTemplates: serverExercises,
            },
          ],
        },
      });
    }
    if (url === TEMPLATE_URL) {
      return Promise.resolve({
        data: { id: TRAINING_ID, name: 'Treino A', category: 'strength', trainingTemplateExerciseTemplates: serverExercises },
      });
    }
    return Promise.resolve({ data: { data: [], total: 0, page: 1, limit: 100 } });
  });
};

// Renders the template builder on the routine edit route.
const renderEditor = () =>
  renderWithRoute(<RoutineBuilder />, {
    route: `/trainer/routines/${ROUTINE_ID}/edit`,
    path: '/trainer/routines/:id/edit',
  });

// Expands the training card and waits for its exercise list.
const expand = async (user) => {
  await user.click(await screen.findByRole('button', { name: /Expandir treino/i }));
  await screen.findByRole('list', { name: /Exercícios/i });
};

// Toggles the selection checkbox of the exercise with the given name.
const selectRow = async (user, name) => {
  const [target] = screen.getAllByRole('button', { name: new RegExp(`Selecionar ${name}`, 'i') });
  await user.click(target);
};

// Lists the URLs an axios mock was called with.
const calledUrls = (mock) => mock.mock.calls.map(([url]) => url);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver);
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  useRoutineDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
  useProtocolDraft.mockReturnValue({ lastSaved: null, clearDraft: vi.fn() });
  useToast.mockReturnValue({ showToast: mockShowToast });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── AC 9 — create ───────────────────────────────────────────────────────────

describe('RoutineBuilder (template) — create bi-set (AC 9)', () => {
  it('shows a secondary "Criar bi-set" toolbar button with 2+ ungrouped exercises', async () => {
    mockServer(UNGROUPED);
    const user = userEvent.setup();
    renderEditor();
    await expand(user);

    const button = screen.getByRole('button', { name: /^Criar bi-set$/i });
    expect(button).toBeEnabled();
    expect(button).toHaveClass('btn--secondary');
  });

  it('disables "Criar bi-set" with fewer than 2 ungrouped exercises', async () => {
    mockServer([junction('j1', 'Supino reto', 0)]);
    const user = userEvent.setup();
    renderEditor();
    await expand(user);

    expect(screen.getByRole('button', { name: /^Criar bi-set$/i })).toBeDisabled();
  });

  it('POSTs the selected junction ids to the template superset endpoint, refetches the template and renders the group', async () => {
    mockServer(UNGROUPED);
    api.post.mockImplementation((url) => {
      if (url === `${TEMPLATE_URL}/supersets`) {
        // why: the server groups the members; the next GET reflects it.
        serverExercises = [grouped('j1', 'Supino reto', 0, 0), grouped('j2', 'Rosca direta', 1, 1), UNGROUPED[2]];
        return Promise.resolve({ data: { id: TRAINING_ID, trainingTemplateExerciseTemplates: serverExercises } });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });
    const user = userEvent.setup();
    const { container } = renderEditor();
    await expand(user);
    expect(container.querySelector('.biset-group-section')).toBeNull();
    api.get.mockClear();

    await user.click(screen.getByRole('button', { name: /^Criar bi-set$/i }));
    const bar = await screen.findByRole('toolbar', { name: /Seleção de exercícios/i });
    await selectRow(user, 'Supino reto');
    await selectRow(user, 'Rosca direta');
    await user.click(within(bar).getByRole('button', { name: /^Criar bi-set$/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(`${TEMPLATE_URL}/supersets`, { exerciseIds: ['j1', 'j2'] })
    );
    await waitFor(() => expect(calledUrls(api.get)).toContain(TEMPLATE_URL));
    await waitFor(() => expect(container.querySelector('.biset-group-section')).not.toBeNull());
    expect(screen.getByRole('group', { name: 'Bi-set' })).toBeInTheDocument();
    expect(calledUrls(api.post).some((u) => u.startsWith('/trainer/trainings/'))).toBe(false);
  });

  it('shows an error toast and renders no group when the create request fails', async () => {
    mockServer(UNGROUPED);
    const err = new Error('boom');
    err.userMessage = 'Falha ao criar bi-set';
    api.post.mockRejectedValue(err);
    const user = userEvent.setup();
    const { container } = renderEditor();
    await expand(user);

    await user.click(screen.getByRole('button', { name: /^Criar bi-set$/i }));
    const bar = await screen.findByRole('toolbar', { name: /Seleção de exercícios/i });
    await selectRow(user, 'Supino reto');
    await selectRow(user, 'Rosca direta');
    await user.click(within(bar).getByRole('button', { name: /^Criar bi-set$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(`${TEMPLATE_URL}/supersets`, { exerciseIds: ['j1', 'j2'] }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(container.querySelector('.biset-group-section')).toBeNull();
  });
});

// ─── AC 10 — dissolve ────────────────────────────────────────────────────────

describe('RoutineBuilder (template) — dissolve bi-set (AC 10)', () => {
  it('trash opens exactly one ConfirmDialog (alertdialog) and nothing is deleted before confirming', async () => {
    mockServer(GROUPED_PAIR);
    const user = userEvent.setup();
    renderEditor();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    await user.click(within(group).getByRole('button', { name: /^Desfazer bi-set$/i }));

    expect(await screen.findAllByRole('alertdialog')).toHaveLength(1);
    expect(screen.queryAllByRole('dialog')).toHaveLength(0);
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('confirming DELETEs the template superset group, refetches the template and drops the group; never touches /trainer/trainings', async () => {
    mockServer(GROUPED_PAIR);
    api.delete.mockImplementation((url) => {
      if (url === `${TEMPLATE_URL}/supersets/${GROUP_ID}`) {
        serverExercises = [junction('j1', 'Supino reto', 0), junction('j2', 'Rosca direta', 1)];
        return Promise.resolve({ data: { id: TRAINING_ID, trainingTemplateExerciseTemplates: serverExercises } });
      }
      return Promise.reject(new Error(`Unexpected DELETE ${url}`));
    });
    const user = userEvent.setup();
    const { container } = renderEditor();
    await expand(user);
    api.get.mockClear();

    const group = screen.getByRole('group', { name: 'Bi-set' });
    await user.click(within(group).getByRole('button', { name: /^Desfazer bi-set$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /Desfazer bi-set/i }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`${TEMPLATE_URL}/supersets/${GROUP_ID}`));
    await waitFor(() => expect(calledUrls(api.get)).toContain(TEMPLATE_URL));
    await waitFor(() => expect(container.querySelector('.biset-group-section')).toBeNull());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    const allUrls = [...calledUrls(api.get), ...calledUrls(api.post), ...calledUrls(api.patch), ...calledUrls(api.delete)];
    expect(allUrls.some((u) => u.startsWith('/trainer/trainings/'))).toBe(false);
  });

  it('cancelling the confirm keeps the bi-set and sends no request', async () => {
    mockServer(GROUPED_PAIR);
    const user = userEvent.setup();
    const { container } = renderEditor();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    await user.click(within(group).getByRole('button', { name: /^Desfazer bi-set$/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^Cancelar$/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
    expect(container.querySelector('.biset-group-section')).not.toBeNull();
  });
});

// ─── AC 11 — round rest ──────────────────────────────────────────────────────

describe('RoutineBuilder (template) — round rest (AC 11)', () => {
  it('committing a new round rest PATCHes the template superset group', async () => {
    mockServer(GROUPED_PAIR);
    api.patch.mockImplementation((url) => {
      if (url === `${TEMPLATE_URL}/supersets/${GROUP_ID}`) {
        serverExercises = GROUPED_PAIR.map((e) => ({ ...e, supersetRestInterval: 120 }));
        return Promise.resolve({ data: { id: TRAINING_ID, trainingTemplateExerciseTemplates: serverExercises } });
      }
      return Promise.reject(new Error(`Unexpected PATCH ${url}`));
    });
    const user = userEvent.setup();
    renderEditor();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    const input = within(group).getByRole('spinbutton', { name: /Descanso da rodada/i });
    expect(input).toHaveValue(90);
    await user.clear(input);
    await user.type(input, '120');
    await user.tab();

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(`${TEMPLATE_URL}/supersets/${GROUP_ID}`, { restInterval: 120 })
    );
    expect(calledUrls(api.patch).some((u) => u.startsWith('/trainer/trainings/'))).toBe(false);
  });

  it('does not PATCH when the value is unchanged', async () => {
    mockServer(GROUPED_PAIR);
    const user = userEvent.setup();
    renderEditor();
    await expand(user);

    const group = screen.getByRole('group', { name: 'Bi-set' });
    await user.click(within(group).getByRole('spinbutton', { name: /Descanso da rodada/i }));
    await user.tab();

    expect(api.patch).not.toHaveBeenCalled();
  });
});

// ─── AC 12 — member delete ───────────────────────────────────────────────────

describe('RoutineBuilder (template) — deleting a bi-set member (AC 12)', () => {
  it('refetches the template so the server-side auto-dissolve renders (no stale 1-member bi-set)', async () => {
    mockServer(GROUPED_PAIR);
    api.delete.mockImplementation((url) => {
      if (url === `${TEMPLATE_URL}/exercises/j1`) {
        // why: server auto-dissolves the group left with a single member.
        serverExercises = [junction('j2', 'Rosca direta', 0)];
        return Promise.resolve({ data: {} });
      }
      return Promise.reject(new Error(`Unexpected DELETE ${url}`));
    });
    const user = userEvent.setup();
    const { container } = renderEditor();
    await expand(user);
    api.get.mockClear();

    await user.click(screen.getByRole('button', { name: /Ações de Supino reto/i }));
    await user.click(await screen.findByRole('menuitem', { name: /Remover/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^Excluir$/i }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`${TEMPLATE_URL}/exercises/j1`));
    await waitFor(() => expect(calledUrls(api.get)).toContain(TEMPLATE_URL));
    await waitFor(() => expect(container.querySelector('.biset-group-section')).toBeNull());
    expect(screen.getByText('Rosca direta')).toBeInTheDocument();
    expect(screen.queryByText('Supino reto')).not.toBeInTheDocument();
  });
});

// ─── AC 14 — no substitutes in templates ─────────────────────────────────────

describe('RoutineBuilder (template) — substitutes stay protocol-only (AC 14)', () => {
  it('does not offer "Adicionar substituto" on a bi-set member or a single exercise', async () => {
    mockServer([...GROUPED_PAIR, junction('j3', 'Agachamento livre', 2)]);
    const user = userEvent.setup();
    renderEditor();
    await expand(user);

    await user.click(screen.getByRole('button', { name: /Ações de Supino reto/i }));
    expect(await screen.findByRole('menuitem', { name: /Remover/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Adicionar substituto/i })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /Ações de Agachamento livre/i }));
    expect(await screen.findByRole('menuitem', { name: /Remover/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Adicionar substituto/i })).not.toBeInTheDocument();
  });
});
