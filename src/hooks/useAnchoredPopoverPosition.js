import { useCallback, useEffect, useLayoutEffect } from 'react';

const POPOVER_OFFSET = 4;
const EDGE_MARGIN = 8;
const VIEWPORT_GUTTER = 16;
const HEIGHT_FALLBACK = 300;
const WIDTH_FALLBACK = 160;

/** Below the trigger, aligned to its left edge. */
export const placeBelowStart = (rect) => ({ top: rect.bottom + POPOVER_OFFSET, left: rect.left });

/** Below the trigger, left edge clamped inside the viewport gutters. */
export const placeBelowStartClamped = (rect, popover) => {
  const maxLeft = window.innerWidth - popover.offsetWidth - VIEWPORT_GUTTER;
  return {
    top: rect.bottom + POPOVER_OFFSET,
    left: Math.max(VIEWPORT_GUTTER, Math.min(rect.left, maxLeft)),
  };
};

// Top coordinate: below the trigger, or above it when there is no room below and more room above.
const flipTop = (rect, height) => {
  const spaceBelow = window.innerHeight - rect.bottom;
  const flipUp = spaceBelow < height + POPOVER_OFFSET && rect.top > spaceBelow;
  return flipUp
    ? Math.max(EDGE_MARGIN, rect.top - height - POPOVER_OFFSET)
    : rect.bottom + POPOVER_OFFSET;
};

/** Below the trigger, or above when there is no room below and more room above. */
export const placeFlipStart = (rect, popover) => {
  const height = popover.offsetHeight || HEIGHT_FALLBACK;
  const width = popover.offsetWidth || WIDTH_FALLBACK;
  return { top: flipTop(rect, height), left: Math.min(rect.left, window.innerWidth - width - EDGE_MARGIN) };
};

/** Like placeFlipStart, but right edge aligned with the trigger's right edge. */
export const placeFlipEnd = (rect, popover) => ({
  top: flipTop(rect, popover.offsetHeight || HEIGHT_FALLBACK),
  right: window.innerWidth - rect.right,
});

/** Below the trigger, right edge aligned with the trigger's right edge. */
export const placeBelowEnd = (rect) => ({
  top: rect.bottom + POPOVER_OFFSET,
  right: window.innerWidth - rect.right,
});

/**
 * Positions a portaled, fixed popover next to its trigger without any JSX
 * style prop: the computed coordinates are written to the popover element as
 * CSS custom properties (--popover-top / --popover-left / --popover-right)
 * from a layout effect, and re-applied on window resize and scroll.
 * The popover's stylesheet owns position, z-index and the var() bindings.
 */
const useAnchoredPopoverPosition = ({ open, triggerRef, popoverRef, place = placeBelowStart }) => {
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    const coords = place(trigger.getBoundingClientRect(), popover);
    Object.entries(coords).forEach(([edge, px]) => {
      popover.style.setProperty(`--popover-${edge}`, `${px}px`);
    });
  }, [triggerRef, popoverRef, place]);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, reposition]);

  return reposition;
};

export default useAnchoredPopoverPosition;
