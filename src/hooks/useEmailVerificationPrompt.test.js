import { act, renderHook } from '../test/test-utils';
import useEmailVerificationPrompt from './useEmailVerificationPrompt';

const EVENT = 'teufit:emailVerificationRequired';

// Dispatches the blocked-request event with the given detail.
const announce = (detail) => act(() => {
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
});

describe('useEmailVerificationPrompt', () => {
  it('has no prompt until a request is blocked', () => {
    const { result } = renderHook(() => useEmailVerificationPrompt());

    expect(result.current.prompt).toBeNull();
  });

  it('opens the prompt with the reason of the blocked request', () => {
    const { result } = renderHook(() => useEmailVerificationPrompt());

    announce({ reason: 'ai' });

    expect(result.current.prompt).toEqual({ reason: 'ai' });
  });

  it('opens the prompt with no reason for an event without detail', () => {
    const { result } = renderHook(() => useEmailVerificationPrompt());

    announce(undefined);

    expect(result.current.prompt).toEqual({ reason: undefined });
  });

  it('closes the prompt and stops listening after unmount', () => {
    const { result, unmount } = renderHook(() => useEmailVerificationPrompt());
    announce({});

    act(() => result.current.closePrompt());
    expect(result.current.prompt).toBeNull();

    unmount();
    announce({ reason: 'ai' });
    expect(result.current.prompt).toBeNull();
  });
});
