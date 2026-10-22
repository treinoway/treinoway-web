import { renderHook, waitFor, act } from '@testing-library/react';
import useExerciseTemplateRecord from './useExerciseTemplateRecord';
import api from '../api/axios';

vi.mock('../api/axios', () => ({ default: { get: vi.fn() } }));

describe('useExerciseTemplateRecord', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('is ready without a request when there is no id', () => {
    const { result } = renderHook(() => useExerciseTemplateRecord(undefined));
    expect(result.current.status).toBe('ready');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('is loading until the GET resolves, then exposes the record', async () => {
    api.get.mockResolvedValue({ data: { id: 1, name: 'A' } });
    const { result } = renderHook(() => useExerciseTemplateRecord('1'));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.template).toEqual({ id: 1, name: 'A' });
  });

  it('reports notFound only for a 404', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => useExerciseTemplateRecord('1'));
    await waitFor(() => expect(result.current.status).toBe('notFound'));
  });

  it('reports error with a message for other failures and retries', async () => {
    api.get.mockRejectedValueOnce({ userMessage: 'Falha' });
    const { result } = renderHook(() => useExerciseTemplateRecord('1'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.loadError).toBe('Falha');

    api.get.mockResolvedValue({ data: { id: 1 } });
    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
});
