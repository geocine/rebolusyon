import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Phone portrait or a short landscape phone screen. */
export const PHONE_QUERY = '(max-width: 760px), (max-height: 520px) and (orientation: landscape)';

export const usePhone = () => useMediaQuery(PHONE_QUERY);

/**
 * Element fullscreen for browsers that allow it. `available` is false on iPhone Safari and when
 * the window is already fullscreen by other means (F11, or the installed app), since the page
 * can't leave those itself.
 */
export function useFullscreen() {
  const [on, setOn] = useState(() => !!document.fullscreenElement);
  const displayFull = useMediaQuery('(display-mode: fullscreen)');
  useEffect(() => {
    const onChange = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const available = !!document.fullscreenEnabled && (on || !displayFull);
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  };
  return { available, on, toggle };
}

export function useViewportHeight(): number {
  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return h;
}
