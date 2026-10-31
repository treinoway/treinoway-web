import { useEffect } from 'react';
import { isNative, openExternalUrl } from '../platform';

// Returns the absolute http(s) URL of an anchor that leaves the app, or null for in-app, mailto and tel links.
const findExternalUrl = (anchor) => {
  if (!anchor?.href) return null;
  const url = new URL(anchor.href, window.location.href);
  const isWebUrl = url.protocol === 'http:' || url.protocol === 'https:';
  return isWebUrl && url.origin !== window.location.origin ? url.href : null;
};

// Sends every link to another origin to the system browser (native only), so the app WebView never navigates away.
const useExternalLinks = () => {
  useEffect(() => {
    if (!isNative()) return undefined;
    const handleClick = (event) => {
      const externalUrl = findExternalUrl(event.target.closest?.('a[href]'));
      if (!externalUrl) return;
      event.preventDefault();
      openExternalUrl(externalUrl).catch((error) => console.error('[links] could not open the browser:', error));
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
};

export default useExternalLinks;
