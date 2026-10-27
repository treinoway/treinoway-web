import { useRef } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '../test/test-utils';
import useAnchoredPopoverPosition, {
  placeBelowStart,
  placeBelowStartClamped,
  placeFlipStart,
  placeBelowEnd,
  placeFlipEnd,
} from './useAnchoredPopoverPosition';

const rect = (overrides = {}) => ({ top: 100, bottom: 140, left: 50, right: 150, ...overrides });
const popover = (width, height) => ({ offsetWidth: width, offsetHeight: height });

const setViewport = (width, height) => {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true, writable: true });
};

describe('placement strategies', () => {
  afterEach(() => setViewport(1024, 768));

  it('placeBelowStart aligns under the trigger left edge', () => {
    expect(placeBelowStart(rect())).toEqual({ top: 144, left: 50 });
  });

  it('placeBelowStartClamped keeps the popover inside the viewport gutters', () => {
    setViewport(400, 800);
    expect(placeBelowStartClamped(rect({ left: 380 }), popover(200, 50))).toEqual({ top: 144, left: 184 });
    expect(placeBelowStartClamped(rect({ left: 2 }), popover(200, 50))).toEqual({ top: 144, left: 16 });
  });

  it('placeFlipStart flips above when there is no room below', () => {
    setViewport(1000, 400);
    const result = placeFlipStart(rect({ top: 300, bottom: 340 }), popover(100, 200));
    expect(result.top).toBe(96);
  });

  it('placeFlipStart stays below when there is room', () => {
    setViewport(1000, 800);
    expect(placeFlipStart(rect(), popover(100, 200)).top).toBe(144);
  });

  it('placeFlipEnd flips above near the bottom, keeping the right edge', () => {
    setViewport(1000, 400);
    expect(placeFlipEnd(rect({ top: 300, bottom: 340 }), popover(100, 200))).toEqual({ top: 96, right: 850 });
  });

  it('placeFlipEnd stays below when there is room', () => {
    setViewport(1000, 800);
    expect(placeFlipEnd(rect(), popover(100, 200))).toEqual({ top: 144, right: 850 });
  });

  it('placeFlipEnd uses a height fallback and clamps to the top edge', () => {
    setViewport(1000, 400);
    expect(placeFlipEnd(rect({ top: 250, bottom: 290 }), popover(100, 0)).top).toBe(8);
  });

  it('placeBelowEnd anchors the right edge', () => {
    setViewport(1000, 800);
    expect(placeBelowEnd(rect())).toEqual({ top: 144, right: 850 });
  });
});

const Harness = ({ open }) => { // eslint-disable-line react/prop-types
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  useAnchoredPopoverPosition({ open, triggerRef, popoverRef });
  return (
    <>
      <button ref={triggerRef} type="button">Gatilho</button>
      {open && <div ref={popoverRef} role="dialog" aria-label="Popover" />}
    </>
  );
};

describe('useAnchoredPopoverPosition', () => {
  it('writes CSS custom properties on the popover and no inline position styles', () => {
    render(<Harness open />);
    const dialog = screen.getByRole('dialog', { name: 'Popover' });

    expect(dialog.style.getPropertyValue('--popover-top')).toBe('4px');
    expect(dialog.style.getPropertyValue('--popover-left')).toBe('0px');
    expect(dialog.style.position).toBe('');
    expect(dialog.style.zIndex).toBe('');
  });

  it('repositions on resize and scroll', () => {
    render(<Harness open />);
    const dialog = screen.getByRole('dialog', { name: 'Popover' });
    const trigger = screen.getByRole('button', { name: 'Gatilho' });
    trigger.getBoundingClientRect = () => ({ top: 10, bottom: 30, left: 20, right: 60 });

    fireEvent(window, new Event('resize'));
    expect(dialog.style.getPropertyValue('--popover-top')).toBe('34px');
    expect(dialog.style.getPropertyValue('--popover-left')).toBe('20px');

    trigger.getBoundingClientRect = () => ({ top: 0, bottom: 20, left: 5, right: 45 });
    fireEvent.scroll(document.body);
    expect(dialog.style.getPropertyValue('--popover-top')).toBe('24px');
  });

  it('does nothing while closed', () => {
    render(<Harness open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
