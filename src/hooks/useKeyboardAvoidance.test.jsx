import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '../test/test-utils';
import useKeyboardAvoidance from './useKeyboardAvoidance';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), onKeyboardVisibility: vi.fn() }));
vi.mock('../platform', () => platform);

let reportVisibility;
const dispose = vi.fn();

// Renders a field with the hook active.
const Field = () => {
  useKeyboardAvoidance();
  return <input aria-label="Nome do exercício" />;
};

describe('useKeyboardAvoidance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.isNative.mockReturnValue(true);
    platform.onKeyboardVisibility.mockImplementation(async (callback) => {
      reportVisibility = callback;
      return dispose;
    });
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    document.documentElement.classList.remove('keyboard-open');
  });

  it('flags the document while the keyboard is open and clears it when it closes', async () => {
    render(<Field />);
    await waitFor(() => expect(reportVisibility).toEqual(expect.any(Function)));

    act(() => reportVisibility(true));
    expect(document.documentElement).toHaveClass('keyboard-open');
    act(() => reportVisibility(false));

    expect(document.documentElement).not.toHaveClass('keyboard-open');
  });

  it('scrolls the focused field into view once the keyboard opened', async () => {
    render(<Field />);
    await waitFor(() => expect(reportVisibility).toEqual(expect.any(Function)));
    screen.getByLabelText('Nome do exercício').focus();

    act(() => reportVisibility(true));

    await waitFor(() => expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' }));
  });

  it('removes the flag and the listener on unmount', async () => {
    const { unmount } = render(<Field />);
    await waitFor(() => expect(reportVisibility).toEqual(expect.any(Function)));
    act(() => reportVisibility(true));

    unmount();

    expect(document.documentElement).not.toHaveClass('keyboard-open');
    await waitFor(() => expect(dispose).toHaveBeenCalledTimes(1));
  });

  it('does nothing on the website', () => {
    platform.isNative.mockReturnValue(false);

    render(<Field />);

    expect(platform.onKeyboardVisibility).not.toHaveBeenCalled();
  });
});
