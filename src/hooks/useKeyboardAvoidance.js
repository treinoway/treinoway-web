import { useEffect } from 'react';
import { isNative, onKeyboardVisibility } from '../platform';

const KEYBOARD_OPEN_CLASS = 'keyboard-open';
const SCROLL_DELAY_MS = 150;

// Scrolls the focused field to the middle of the visible area once the keyboard finished resizing the viewport.
const scrollFocusedFieldIntoView = () => {
  const field = document.activeElement;
  if (!field || field === document.body || !field.matches?.('input, textarea, select, [contenteditable="true"]')) return;
  field.scrollIntoView({ block: 'center', behavior: 'smooth' });
};

// Native only: flags <html> while the soft keyboard is open (CSS then frees the space the fixed bars take) and keeps the focused field in view.
const useKeyboardAvoidance = () => {
  useEffect(() => {
    if (!isNative()) return undefined;
    let dispose = null;
    let cancelled = false;
    let scrollTimer = null;
    const root = document.documentElement;

    const handleVisibility = (visible) => {
      root.classList.toggle(KEYBOARD_OPEN_CLASS, visible);
      clearTimeout(scrollTimer);
      if (visible) scrollTimer = setTimeout(scrollFocusedFieldIntoView, SCROLL_DELAY_MS);
    };
    const handleFocusIn = () => {
      if (root.classList.contains(KEYBOARD_OPEN_CLASS)) scrollFocusedFieldIntoView();
    };

    document.addEventListener('focusin', handleFocusIn);
    onKeyboardVisibility(handleVisibility).then((disposer) => {
      if (cancelled) disposer();
      else dispose = disposer;
    });

    return () => {
      cancelled = true;
      clearTimeout(scrollTimer);
      document.removeEventListener('focusin', handleFocusIn);
      root.classList.remove(KEYBOARD_OPEN_CLASS);
      dispose?.();
    };
  }, []);
};

export default useKeyboardAvoidance;
