import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseTemplateForm from './ExerciseTemplateForm';
import CreateExerciseTemplateModal from './CreateExerciseTemplateModal';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { DROP_SET, REST_PAUSE, CLUSTER_SET, techniqueEnvelope, toRef } from '../test/advancedTechniqueFixtures';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const EXISTING = {
  id: 'et-1',
  name: 'Supino',
  type: 'strength',
  isPublic: false,
  // out of array order on purpose: `order` wins
  advancedTechniques: [toRef(REST_PAUSE, 1), toRef(DROP_SET, 0)],
};

// Test helper: addTechnique.
const addTechnique = async (user, name) => {
  await user.click(screen.getByRole('combobox', { name: /buscar técnica avançada/i }));
  await user.click(await screen.findByRole('option', { name: new RegExp(name) }));
};

describe('ExerciseTemplateForm — advanced techniques (criterion 12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockResolvedValue(techniqueEnvelope([DROP_SET, REST_PAUSE, CLUSTER_SET]));
    api.post.mockResolvedValue({ data: { id: 'et-new' } });
    api.patch.mockResolvedValue({ data: EXISTING });
  });

  it('renders the same ordered techniques field without fetching on mount', () => {
    render(<ExerciseTemplateForm onCancel={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: /buscar técnica avançada/i })).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('create sends advancedTechniqueIds in the chosen order', async () => {
    const user = userEvent.setup();
    render(<ExerciseTemplateForm onCancel={vi.fn()} onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText(/^nome/i), 'Remada');
    await user.click(screen.getByRole('radio', { name: /força/i }));
    await addTechnique(user, 'Rest-pause');
    await addTechnique(user, 'Drop set');

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/exercise-templates', expect.objectContaining({ advancedTechniqueIds: ['tech-rest', 'tech-drop'] }));
    });
  });

  it('create omits advancedTechniqueIds when none were picked', async () => {
    const user = userEvent.setup();
    render(<ExerciseTemplateForm onCancel={vi.fn()} onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText(/^nome/i), 'Remada');
    await user.click(screen.getByRole('radio', { name: /força/i }));

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('advancedTechniqueIds');
  });

  it('edit pre-fills the techniques sorted by order', () => {
    render(<ExerciseTemplateForm exerciseTemplate={EXISTING} onCancel={vi.fn()} onSuccess={vi.fn()} />);

    const names = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(names).toEqual([expect.stringContaining('Drop set'), expect.stringContaining('Rest-pause')]);
  });

  it('edit replaces with the full new list when changed', async () => {
    const user = userEvent.setup();
    render(<ExerciseTemplateForm exerciseTemplate={EXISTING} onCancel={vi.fn()} onSuccess={vi.fn()} />);
    await addTechnique(user, 'Cluster set');
    await user.click(screen.getByRole('button', { name: 'Mover Cluster set para cima' }));

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/exercise-templates/et-1', expect.objectContaining({ advancedTechniqueIds: ['tech-drop', 'tech-cluster', 'tech-rest'] }));
    });
  });

  it('edit sends [] when all techniques were removed', async () => {
    const user = userEvent.setup();
    render(<ExerciseTemplateForm exerciseTemplate={EXISTING} onCancel={vi.fn()} onSuccess={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Remover Drop set' }));
    await user.click(screen.getByRole('button', { name: 'Remover Rest-pause' }));

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/exercise-templates/et-1', expect.objectContaining({ advancedTechniqueIds: [] }));
    });
  });

  it('edit does not send the key when the techniques were not touched', async () => {
    const user = userEvent.setup();
    render(<ExerciseTemplateForm exerciseTemplate={EXISTING} onCancel={vi.fn()} onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText(/^nome/i), ' 2');

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect(api.patch.mock.calls[0][1]).not.toHaveProperty('advancedTechniqueIds');
  });

  it('the creation modal exposes the field and sends the ids', async () => {
    const user = userEvent.setup();
    render(<CreateExerciseTemplateModal open onClose={vi.fn()} onSuccess={vi.fn()} />);
    await user.type(screen.getByLabelText(/^nome/i), 'Remada');
    await user.click(screen.getByRole('radio', { name: /força/i }));
    await addTechnique(user, 'Drop set');

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/exercise-templates', expect.objectContaining({ advancedTechniqueIds: ['tech-drop'] }));
    });
  });
});
