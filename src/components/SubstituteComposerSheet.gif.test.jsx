import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import SubstituteComposerSheet from './SubstituteComposerSheet';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const template = {
  id: 'tmpl-1', name: 'Supino reto', type: 'strength', sets: 3,
  repetitions: { min: 10, max: 12 }, hasLoad: true, suggestedLoad: 80, restInterval: 60,
  prescriptionMode: 'reps', gifUrl: 'https://media.example.com/supino.gif',
};

describe('SubstituteComposerSheet — GIF', () => {
  beforeEach(() => {
    api.post.mockReset();
    api.get.mockReset();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  it('copies gifUrl from the library template', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 'sub-1' } });
    render(
      <SubstituteComposerSheet open principal={{ id: 'ex-1', type: 'strength' }} onClose={vi.fn()} onCreated={vi.fn()} exerciseTemplates={[template]} />
    );

    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));
    await user.click(screen.getByText('Supino reto').closest('button'));
    await user.click(screen.getByRole('button', { name: /importar 1/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercises/ex-1/substitutes',
        expect.objectContaining({ gifUrl: 'https://media.example.com/supino.gif' })
      );
    });
  });
});
