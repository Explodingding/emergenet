'use client';
import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

// Tracks whether the viewport is narrow enough to warrant the mobile
// layout (bottom sheets instead of side panels, stacked instead of
// side-by-side columns). Matches Tailwind's `md` breakpoint so it lines
// up with any `md:` classes used alongside it.
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
