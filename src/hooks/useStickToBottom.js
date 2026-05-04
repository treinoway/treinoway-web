import { useState, useRef, useCallback, useEffect } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const useStickToBottom = ({ threshold = 80 } = {}) => {
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [shouldFollow, setShouldFollow] = useState(true);

  const rafRef = useRef(null);
  const bottomRef = useRef(null);

  const getScrollInfo = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const distanceFromBottom = docHeight - scrollTop - windowHeight;
    return { distanceFromBottom };
  }, []);

  const scrollToBottom = useCallback((opts = {}) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;

      const behavior =
        opts.behavior === 'smooth' && !prefersReducedMotion() ? 'smooth' : 'auto';

      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior, block: 'end' });
      } else {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
      }

      setIsNearBottom(true);
      setShouldFollow(true);
    });
  }, []);

  const onScroll = useCallback(() => {
    const { distanceFromBottom } = getScrollInfo();
    const near = distanceFromBottom <= threshold;
    setIsNearBottom(near);
    if (near) {
      setShouldFollow(true);
    } else {
      setShouldFollow(false);
    }
  }, [getScrollInfo, threshold]);

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [onScroll]);

  return { isNearBottom, shouldFollow, scrollToBottom, onScroll, bottomRef };
};

export default useStickToBottom;
