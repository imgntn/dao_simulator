'use client';

import { useState, useEffect } from 'react';

export type BreakpointTier = 'compact' | 'handheld' | 'tablet' | 'desktop' | 'ultrawide';

function getTier(width: number): BreakpointTier {
  if (width < 600) return 'compact';
  if (width < 900) return 'handheld';
  if (width < 1280) return 'tablet';
  if (width < 1920) return 'desktop';
  return 'ultrawide';
}

export function useBreakpointTier(): BreakpointTier {
  const [tier, setTier] = useState<BreakpointTier>(() =>
    typeof window !== 'undefined' ? getTier(window.innerWidth) : 'desktop'
  );

  useEffect(() => {
    const update = () => setTier(getTier(window.innerWidth));
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return tier;
}

/** Returns default sidebar width for the given tier */
export function sidebarWidthForTier(tier: BreakpointTier): number {
  switch (tier) {
    case 'compact': return 0;
    case 'handheld': return 380;
    case 'tablet': return 320;
    case 'desktop': return 380;
    case 'ultrawide': return 420;
  }
}
