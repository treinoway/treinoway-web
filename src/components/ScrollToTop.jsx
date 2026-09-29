import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  // useLayoutEffect (not useEffect) so the scroll reset lands before the
  // browser paints the new route. This is a client-only SPA (no SSR), so
  // the usual hydration-mismatch warning for useLayoutEffect does not
  // apply. Without this, navigating to a long page from a scrolled-down
  // position paints one frame at the stale offset before jumping to top.
  useLayoutEffect(() => {
    if (hash) {
      return;
    }

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
