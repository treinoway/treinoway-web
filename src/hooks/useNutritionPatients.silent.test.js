import { renderHook, waitFor, act } from '../test/test-utils';
import useNutritionPatients, { INVITES_TAB } from './useNutritionPatients';
import api from '../api/axios';
import { buildInvite, buildPatientRow } from '../test/nutritionFixtures';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('useNutritionPatients silent reload failure', () => {
  it('keeps the invites list and reports when the post-invite refresh fails', async () => {
    let reloading = false;
    api.get.mockImplementation((url, config) => {
      if (url === '/nutritionist/patients') return Promise.resolve({ data: { items: [buildPatientRow()] } });
      if (!reloading) return Promise.resolve({ data: { items: config?.params?.status === 'pending' ? [buildInvite()] : [] } });
      return Promise.reject(Object.assign(new Error('x'), { userMessage: 'Sem conexão' }));
    });
    api.post.mockResolvedValue({ data: { outcome: 'invited' } });
    const onReloadError = vi.fn();
    const { result } = renderHook(() => useNutritionPatients({ onReloadError }));
    act(() => result.current.setTab(INVITES_TAB));
    await waitFor(() => expect(result.current.invites.data).toHaveLength(1));

    reloading = true;
    await act(async () => { await result.current.invite('novo@example.com'); });

    expect(result.current.invites.data).toHaveLength(1);
    expect(result.current.invites.error).toBeNull();
    expect(onReloadError).toHaveBeenCalledWith('Sem conexão');
  });
});
