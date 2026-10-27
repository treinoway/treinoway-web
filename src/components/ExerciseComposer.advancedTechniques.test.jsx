import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseComposer from './ExerciseComposer';
import api from '../api/axios';
import { DROP_SET, REST_PAUSE, CLUSTER_SET, techniqueEnvelope, toRef } from '../test/advancedTechniqueFixtures';

vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }) }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const TEMPLATE_WITH_TECHNIQUES = {
  id: 'tmpl-tech',
  name: 'Leg press',
  type: 'strength',
  advancedTechniques: [toRef(DROP_SET, 0), toRef(REST_PAUSE, 1)],
};

const TEMPLATE_WITHOUT = { id: 'tmpl-plain', name: 'Remada', type: 'strength' };

const EDIT_SNAPSHOT = {
  id: 'ex-1',
  name: 'Supino reto',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 3,
  repetitions: { min: 8, max: 12 },
  restInterval: 60,
  hasLoad: true,
  // deliberately out of array order: `order` is the source of truth
  advancedTechniques: [toRef(REST_PAUSE, 1), toRef(DROP_SET, 0)],
};

// Test helper: buildProps.
const buildProps = (extra = {}) => ({
  snapshot: null,
  exerciseTemplates: [TEMPLATE_WITH_TECHNIQUES, TEMPLATE_WITHOUT],
  saving: false,
  onSubmitCreate: vi.fn(),
  onSubmitEdit: vi.fn(),
  onSubmitFromLibrary: vi.fn(),
  onSubmitFromTemplate: vi.fn().mockResolvedValue({}),
  onCancel: vi.fn(),
  ...extra,
});

// Test helper: fillReps.
const fillReps = async (user) => {
  await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
  await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
};

// Test helper: addTechnique.
const addTechnique = async (user, name) => {
  await user.click(screen.getByRole('combobox', { name: /buscar técnica avançada/i }));
  await user.click(await screen.findByRole('option', { name: new RegExp(name) }));
};

// Test helper: pickTemplate.
const pickTemplate = async (user, query, name) => {
  await user.type(screen.getByRole('combobox', { name: /Buscar na biblioteca/i }), query);
  await user.click(await screen.findByRole('option', { name }));
};

// Test helper: listedNames.
const listedNames = () => screen.getAllByRole('listitem').map((item) => item.textContent);

describe('ExerciseComposer — advanced techniques, create tab (criterion 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(techniqueEnvelope([DROP_SET, REST_PAUSE, CLUSTER_SET]));
  });

  it('shows the Técnicas avançadas section in the create form', async () => {
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps()} />);
    await user.click(screen.getByRole('tab', { name: /Criar novo/i }));

    expect(screen.getByText('Técnicas avançadas')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /buscar técnica avançada/i })).toBeInTheDocument();
  });

  it('sends advancedTechniqueIds in the chosen order', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<ExerciseComposer {...props} />);
    await user.click(screen.getByRole('tab', { name: /Criar novo/i }));
    await user.type(screen.getByLabelText(/^Nome/), 'Supino');
    await fillReps(user);
    await addTechnique(user, 'Rest-pause');
    await addTechnique(user, 'Drop set');
    await user.click(screen.getByRole('button', { name: 'Mover Drop set para cima' }));

    await user.click(screen.getByRole('button', { name: 'Salvar exercício' }));

    await waitFor(() => expect(props.onSubmitCreate).toHaveBeenCalledTimes(1));
    const payload = props.onSubmitCreate.mock.calls[0][0];
    expect(payload.advancedTechniqueIds).toEqual(['tech-drop', 'tech-rest']);
    // why: display snapshot (same order) so drafts can re-open the drawer; hooks strip it before the API
    expect(payload.advancedTechniques.map((technique) => technique.id)).toEqual(['tech-drop', 'tech-rest']);
  });

  it('omits advancedTechniqueIds on create when none were picked', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<ExerciseComposer {...props} />);
    await user.click(screen.getByRole('tab', { name: /Criar novo/i }));
    await user.type(screen.getByLabelText(/^Nome/), 'Supino');
    await fillReps(user);

    await user.click(screen.getByRole('button', { name: 'Salvar exercício' }));

    await waitFor(() => expect(props.onSubmitCreate).toHaveBeenCalledTimes(1));
    expect(props.onSubmitCreate.mock.calls[0][0]).not.toHaveProperty('advancedTechniqueIds');
  });
});

describe('ExerciseComposer — advanced techniques, edit mode (criterion 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(techniqueEnvelope([DROP_SET, REST_PAUSE, CLUSTER_SET]));
  });

  it('pre-fills the existing techniques sorted by order', () => {
    render(<ExerciseComposer {...buildProps({ snapshot: EDIT_SNAPSHOT })} />);

    expect(listedNames()).toEqual([expect.stringContaining('Drop set'), expect.stringContaining('Rest-pause')]);
  });

  it('sends the full ordered list on save', async () => {
    const user = userEvent.setup();
    const props = buildProps({ snapshot: EDIT_SNAPSHOT });
    render(<ExerciseComposer {...props} />);
    await user.click(screen.getByRole('button', { name: 'Mover Drop set para baixo' }));

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(props.onSubmitEdit).toHaveBeenCalledWith('ex-1', expect.objectContaining({ advancedTechniqueIds: ['tech-rest', 'tech-drop'] }));
  });

  it('sends [] when every technique was removed', async () => {
    const user = userEvent.setup();
    const props = buildProps({ snapshot: EDIT_SNAPSHOT });
    render(<ExerciseComposer {...props} />);
    await user.click(screen.getByRole('button', { name: 'Remover Drop set' }));
    await user.click(screen.getByRole('button', { name: 'Remover Rest-pause' }));

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(props.onSubmitEdit).toHaveBeenCalledWith('ex-1', expect.objectContaining({ advancedTechniqueIds: [] }));
  });

  it('sends [] on edit for an exercise that never had techniques (key present, replaces)', async () => {
    const user = userEvent.setup();
    const props = buildProps({ snapshot: { ...EDIT_SNAPSHOT, advancedTechniques: undefined } });
    render(<ExerciseComposer {...props} />);

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(props.onSubmitEdit.mock.calls[0][1].advancedTechniqueIds).toEqual([]);
  });
});

describe('ExerciseComposer — library template inheritance (criterion 14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(techniqueEnvelope([DROP_SET, REST_PAUSE, CLUSTER_SET]));
  });

  it('pre-fills the picked template techniques in order', async () => {
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps()} />);

    await pickTemplate(user, 'leg', /Leg press/i);

    expect(listedNames()).toEqual([expect.stringContaining('Drop set'), expect.stringContaining('Rest-pause')]);
  });

  it('shows no techniques after picking a template without any', async () => {
    const user = userEvent.setup();
    render(<ExerciseComposer {...buildProps()} />);

    await pickTemplate(user, 'remada', /Remada/i);

    expect(screen.queryByRole('list', { name: 'Técnicas selecionadas' })).not.toBeInTheDocument();
  });

  it('omits advancedTechniqueIds from the overrides when the field was not touched (server inherits)', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<ExerciseComposer {...props} />);
    await pickTemplate(user, 'leg', /Leg press/i);
    await fillReps(user);

    await user.click(screen.getByRole('button', { name: 'Salvar exercício' }));

    await waitFor(() => expect(props.onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(props.onSubmitFromTemplate.mock.calls[0][1]).not.toHaveProperty('advancedTechniqueIds');
  });

  it('sends the edited list in the overrides when the trainer changed it', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<ExerciseComposer {...props} />);
    await pickTemplate(user, 'leg', /Leg press/i);
    await fillReps(user);
    await addTechnique(user, 'Cluster set');
    await user.click(screen.getByRole('button', { name: 'Remover Drop set' }));

    await user.click(screen.getByRole('button', { name: 'Salvar exercício' }));

    await waitFor(() => expect(props.onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(props.onSubmitFromTemplate).toHaveBeenCalledWith('tmpl-tech', expect.objectContaining({ advancedTechniqueIds: ['tech-rest', 'tech-cluster'] }));
    expect(props.onSubmitFromTemplate.mock.calls[0][1].advancedTechniques.map((technique) => technique.id)).toEqual(['tech-rest', 'tech-cluster']);
  });

  it('sends [] when the trainer cleared the inherited techniques', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<ExerciseComposer {...props} />);
    await pickTemplate(user, 'leg', /Leg press/i);
    await fillReps(user);
    await user.click(screen.getByRole('button', { name: 'Remover Drop set' }));
    await user.click(screen.getByRole('button', { name: 'Remover Rest-pause' }));

    await user.click(screen.getByRole('button', { name: 'Salvar exercício' }));

    await waitFor(() => expect(props.onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(props.onSubmitFromTemplate.mock.calls[0][1].advancedTechniqueIds).toEqual([]);
  });

  it('does not send advancedTechniqueIds when the template has none and the trainer added none', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<ExerciseComposer {...props} />);
    await pickTemplate(user, 'remada', /Remada/i);
    await fillReps(user);

    await user.click(screen.getByRole('button', { name: 'Salvar exercício' }));

    await waitFor(() => expect(props.onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(props.onSubmitFromTemplate.mock.calls[0][1]).not.toHaveProperty('advancedTechniqueIds');
  });
});
