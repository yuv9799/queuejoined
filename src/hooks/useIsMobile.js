import { useEffect, useState } from 'react';

// Phones / small tablets (below Tailwind's `md` breakpoint = 768px).
// The mobile experience is rendered by dedicated components only when this is
// true, so the desktop layout code path is never touched.
const QUERY = '(max-width: 767px)';

export function useIsMobile() {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false);
  const [isMobile, setIsMobile] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return isMobile;
}
