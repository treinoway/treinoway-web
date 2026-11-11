import { useEffect } from 'react';

// Whether the click is a plain left click that the browser would handle as a navigation
const isPlainClick = (event) => !event.defaultPrevented && event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);

// In-app path of the link a click landed on, or null for anything that is not a same-tab navigation to another page of the app
const internalPathOf = (event) => {
  if (!isPlainClick(event)) return null;
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  const path = `${url.pathname}${url.search}${url.hash}`;
  return path === `${window.location.pathname}${window.location.search}${window.location.hash}` ? null : path;
};

// While `active`, hands clicks on links to other pages of the app to `onIntercept(path)` instead of navigating (BrowserRouter has no blocker)
const useInternalLinkGuard = (active, onIntercept) => {
  useEffect(() => {
    if (!active) return undefined;
    const handleClick = (event) => {
      const path = internalPathOf(event);
      if (!path) return;
      event.preventDefault();
      event.stopPropagation();
      onIntercept(path);
    };
    // why: capture phase on the document runs before React Router's own link handler at the root
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [active, onIntercept]);
};

export default useInternalLinkGuard;
