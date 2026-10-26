import { renderHook, act } from '@testing-library/react';
import useResettablePage from './useResettablePage';

describe('useResettablePage', () => {
  it('starts on page 1 and keeps the page the caller sets', () => {
    const { result } = renderHook(() => useResettablePage('a'));

    act(() => result.current[1](3));

    expect(result.current[0]).toBe(3);
  });

  it('returns to page 1 when the reset key changes', () => {
    const { result, rerender } = renderHook(({ key }) => useResettablePage(key), {
      initialProps: { key: 'a' },
    });
    act(() => result.current[1](3));

    rerender({ key: 'b' });

    expect(result.current[0]).toBe(1);
  });
});
