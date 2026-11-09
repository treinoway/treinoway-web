import { renderHook, waitFor, act } from '../test/test-utils';
import useNutritionPatients, { INVITES_TAB } from './useNutritionPatients';
import api from '../api/axios';
import { buildInvite, buildPatientRow } from '../test/nutritionFixtures';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('useNutritionPatients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => Promise.resolve({
      data: { items: url === '/nutritionist/patients' ? [buildPatientRow()] : [buildInvite()] },
    }));
  });

  it('loads patients on mount and invites only when the tab opens', async () => {
    const { result } = renderHook(() => useNutritionPatients());
    await waitFor(() => expect(result.current.patients.data).toHaveLength(1));
    expect(api.get).not.toHaveBeenCalledWith('/nutritionist/patient-invites', expect.anything());

    act(() => result.current.setTab(INVITES_TAB));
    await waitFor(() => expect(result.current.invites.data).toHaveLength(1));
  });

  it('unlinks a patient locally after the DELETE', async () => {
    api.delete.mockResolvedValue({});
    const { result } = renderHook(() => useNutritionPatients());
    await waitFor(() => expect(result.current.patients.data).toHaveLength(1));

    await act(async () => { await result.current.unlink(buildPatientRow()); });

    expect(api.delete).toHaveBeenCalledWith('/nutritionist/patients/patient-1');
    expect(result.current.patients.data).toEqual([]);
  });

  it('refetches the patients when an invite links an existing account', async () => {
    api.post.mockResolvedValue({ data: { outcome: 'linked', patient: buildPatientRow() } });
    const { result } = renderHook(() => useNutritionPatients());
    await waitFor(() => expect(result.current.patients.data).toHaveLength(1));
    api.get.mockClear();

    await act(async () => { await result.current.invite('a@b.com'); });

    expect(api.get).toHaveBeenCalledWith('/nutritionist/patients');
  });

  it('does not refetch patients when the outcome is a pending invite', async () => {
    api.post.mockResolvedValue({ data: { outcome: 'invited', invite: buildInvite() } });
    const { result } = renderHook(() => useNutritionPatients());
    await waitFor(() => expect(result.current.patients.data).toHaveLength(1));
    api.get.mockClear();

    await act(async () => { await result.current.invite('a@b.com'); });

    expect(api.get).not.toHaveBeenCalled();
  });

  it('resends and revokes invites keeping the list in sync', async () => {
    api.post.mockResolvedValue({ data: buildInvite({ sendCount: 2 }) });
    api.delete.mockResolvedValue({});
    const { result } = renderHook(() => useNutritionPatients());
    act(() => result.current.setTab(INVITES_TAB));
    await waitFor(() => expect(result.current.invites.data).toHaveLength(1));

    await act(async () => { await result.current.resend(buildInvite()); });
    expect(result.current.invites.data[0].sendCount).toBe(2);

    await act(async () => { await result.current.revoke(buildInvite()); });
    expect(result.current.invites.data).toEqual([]);
  });
});
