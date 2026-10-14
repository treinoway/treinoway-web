import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Modal a11y: close on Escape, trap Tab inside `containerRef`,
 * focus the container on open and restore focus to the trigger on close.
 */
const useModalBehavior = (containerRef, onClose) => {
  // Keep the latest handler without re-running the effect (which would steal focus on every render).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const container = containerRef.current;
    if (container && !container.contains(document.activeElement)) container.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
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
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [containerRef]);
};

export default useModalBehavior;
