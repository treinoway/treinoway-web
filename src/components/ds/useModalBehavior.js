import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

// True when `el` is a real, still-mounted focus target (not the body fallback).
const isUsableFocusTarget = (el) => Boolean(el) && el !== document.body && el.isConnected;

// Restores focus to the opener, or to the element matching `fallbackSelector` when the opener unmounted.
const restoreFocus = (previouslyFocused, fallbackSelector) => {
  const target = isUsableFocusTarget(previouslyFocused)
    ? previouslyFocused
    : fallbackSelector && document.querySelector(fallbackSelector);
  if (target && typeof target.focus === 'function') target.focus();
};

/**
 * Modal a11y: close on Escape (only while focus is inside `containerRef`, so stacked
 * dialogs do not close each other), trap Tab inside `containerRef`, focus the container
 * on open and restore focus on close (to the opener, else to `returnFocusSelector`).
 */
const useModalBehavior = (containerRef, onClose, { returnFocusSelector } = {}) => {
  // Keep the latest handler without re-running the effect (which would steal focus on every render).
  const onCloseRef = useRef(onClose);
  const returnFocusSelectorRef = useRef(returnFocusSelector);
  useEffect(() => {
    onCloseRef.current = onClose;
    returnFocusSelectorRef.current = returnFocusSelector;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const container = containerRef.current;
    if (container && !container.contains(document.activeElement)) container.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (container && !container.contains(document.activeElement)) return;
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const focusable = [...container.querySelectorAll(FOCUSABLE)].sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocus(previouslyFocused, returnFocusSelectorRef.current);
    };
  }, [containerRef]);
};

export default useModalBehavior;
