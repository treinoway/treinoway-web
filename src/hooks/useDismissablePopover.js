import { useEffect } from 'react';

/**
 * Closes a floating popover on outside pointerdown or Escape.
 * Pointer events inside any of `refs` are ignored (trigger + popover).
 */
const useDismissablePopover = ({ open, refs, onDismiss }) => {
  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const inside = refs.some((ref) => ref.current && ref.current.contains(event.target));
      if (!inside) onDismiss('outside');
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onDismiss('escape');
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // refs are stable ref objects; callers pass a fresh array each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onDismiss]);
};

export default useDismissablePopover;
