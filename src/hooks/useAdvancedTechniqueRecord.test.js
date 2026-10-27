import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useAdvancedTechniqueRecord from './useAdvancedTechniqueRecord';
import { getAdvancedTechnique } from '../api/advancedTechniques';
import { DROP_SET } from '../test/advancedTechniqueFixtures';

vi.mock('../api/advancedTechniques');

describe('useAdvancedTechniqueRecord', () => {
  beforeEach(() => {
    vi.mocked(getAdvancedTechnique).mockReset();
  });

  it('is ready without fetching when there is no id (create mode)', () => {
    const { result } = renderHook(() => useAdvancedTechniqueRecord(undefined));
    expect(result.current.status).toBe('ready');
    expect(result.current.technique).toBeNull();
    expect(getAdvancedTechnique).not.toHaveBeenCalled();
  });

  it('loads the technique', async () => {
    getAdvancedTechnique.mockResolvedValue(DROP_SET);
    const { result } = renderHook(() => useAdvancedTechniqueRecord('tech-drop'));
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.technique).toEqual(DROP_SET);
    expect(getAdvancedTechnique).toHaveBeenCalledWith('tech-drop');
  });

  it('reports notFound on 404 without a load error', async () => {
    getAdvancedTechnique.mockRejectedValue({ response: { status: 404 } });
    const { result } = renderHook(() => useAdvancedTechniqueRecord('missing'));

    await waitFor(() => expect(result.current.status).toBe('notFound'));
    expect(result.current.loadError).toBe('');
  });

  it('reports error with the message on other failures and retries', async () => {
    getAdvancedTechnique.mockRejectedValueOnce({ response: { status: 500 }, userMessage: 'Erro do servidor' });
    const { result } = renderHook(() => useAdvancedTechniqueRecord('tech-drop'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.loadError).toBe('Erro do servidor');

    getAdvancedTechnique.mockResolvedValueOnce(DROP_SET);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.technique).toEqual(DROP_SET);
  });
});
