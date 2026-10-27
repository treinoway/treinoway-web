import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseTemplateForm from './ExerciseTemplateForm';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { DROP_SET, REST_PAUSE, toRef } from '../test/advancedTechniqueFixtures';

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
  advancedTechniques: [toRef(DROP_SET, 0), { ...toRef(REST_PAUSE, 1), isDeleted: true }],
};

describe('ExerciseTemplateForm — soft-deleted techniques on edit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.patch.mockResolvedValue({ data: EXISTING });
  });

  it('flags the deleted technique and the next save drops it from the PATCH', async () => {
    const user = userEvent.setup();
    render(<ExerciseTemplateForm exerciseTemplate={EXISTING} onCancel={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByText('Excluída')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect(api.patch.mock.calls[0][1].advancedTechniqueIds).toEqual(['tech-drop']);
  });

  it('does not resend the key when the template has no deleted technique and nothing changed', async () => {
    const user = userEvent.setup();
    render(<ExerciseTemplateForm exerciseTemplate={{ ...EXISTING, advancedTechniques: [toRef(DROP_SET, 0)] }} onCancel={vi.fn()} onSuccess={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect(api.patch.mock.calls[0][1]).not.toHaveProperty('advancedTechniqueIds');
  });
});
