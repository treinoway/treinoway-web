import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseComposer from './ExerciseComposer';
import api from '../api/axios';
import { DROP_SET, REST_PAUSE, techniqueEnvelope, toRef } from '../test/advancedTechniqueFixtures';

vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }) }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const DELETED_REF = { ...toRef(REST_PAUSE, 1), isDeleted: true };

const EDIT_SNAPSHOT = {
  id: 'ex-1',
  name: 'Supino reto',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 3,
  repetitions: { min: 8, max: 12 },
  restInterval: 60,
  hasLoad: true,
  advancedTechniques: [toRef(DROP_SET, 0), DELETED_REF],
};

const TEMPLATE_WITH_DELETED = { id: 'tmpl-del', name: 'Leg press', type: 'strength', advancedTechniques: [toRef(DROP_SET, 0), DELETED_REF] };

// Test helper: buildProps.
const buildProps = (extra = {}) => ({
  snapshot: null,
  exerciseTemplates: [TEMPLATE_WITH_DELETED],
  saving: false,
  onSubmitCreate: vi.fn(),
  onSubmitEdit: vi.fn(),
  onSubmitFromLibrary: vi.fn(),
  onSubmitFromTemplate: vi.fn().mockResolvedValue({}),
  onCancel: vi.fn(),
  ...extra,
});

describe('ExerciseComposer — soft-deleted techniques', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(techniqueEnvelope([DROP_SET, REST_PAUSE]));
  });

  it('edit shows the Excluída badge and a plain save sends only the live ids', async () => {
    const user = userEvent.setup();
    const props = buildProps({ snapshot: EDIT_SNAPSHOT });
    render(<ExerciseComposer {...props} />);
    expect(screen.getByText('Excluída')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    const payload = props.onSubmitEdit.mock.calls[0][1];
    expect(payload.advancedTechniqueIds).toEqual(['tech-drop']);
    expect(payload.advancedTechniques.map((technique) => technique.id)).toEqual(['tech-drop']);
  });

  it('edit with only a deleted technique sends [] (replace)', async () => {
    const user = userEvent.setup();
    const props = buildProps({ snapshot: { ...EDIT_SNAPSHOT, advancedTechniques: [{ ...DELETED_REF, order: 0 }] } });
    render(<ExerciseComposer {...props} />);

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(props.onSubmitEdit.mock.calls[0][1].advancedTechniqueIds).toEqual([]);
  });

  it('from-template: a template with a deleted technique does not force an override when untouched', async () => {
    const user = userEvent.setup();
    const props = buildProps({ exerciseTemplates: [{ ...TEMPLATE_WITH_DELETED, advancedTechniques: [toRef(DROP_SET, 0), DELETED_REF] }] });
    render(<ExerciseComposer {...props} />);
    await user.type(screen.getByRole('combobox', { name: /Buscar na biblioteca/i }), 'leg');
    await user.click(await screen.findByRole('option', { name: /Leg press/i }));
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');

    await user.click(screen.getByRole('button', { name: 'Salvar exercício' }));

    await waitFor(() => expect(props.onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(props.onSubmitFromTemplate.mock.calls[0][1]).not.toHaveProperty('advancedTechniqueIds');
  });

  it('from-template: removing a live technique overrides with the live ids only', async () => {
    const user = userEvent.setup();
    const props = buildProps();
    render(<ExerciseComposer {...props} />);
    await user.type(screen.getByRole('combobox', { name: /Buscar na biblioteca/i }), 'leg');
    await user.click(await screen.findByRole('option', { name: /Leg press/i }));
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
    await user.click(screen.getByRole('button', { name: 'Remover Drop set' }));

    await user.click(screen.getByRole('button', { name: 'Salvar exercício' }));

    await waitFor(() => expect(props.onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(props.onSubmitFromTemplate.mock.calls[0][1].advancedTechniqueIds).toEqual([]);
  });
});
