'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { usePathname } from 'next/navigation';

interface AnalyticsContextValue {
  trackEvent: (name: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue>({
  trackEvent: () => {},
});

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

function getDeviceCategory(): string {
  if (typeof window === 'undefined') return 'unknown';
  const w = window.innerWidth;
  if (w >= 1024) return 'desktop';
  if (w >= 768) return 'tablet';
  return 'mobile';
}

function getReferrerDomain(): string | null {
  if (typeof document === 'undefined' || !document.referrer) return null;
  try {
    const url = new URL(document.referrer);
    // Skip self-referrals
    if (url.hostname === window.location.hostname) return null;
    return url.hostname;
  } catch {
    return null;
  }
}

function sendBeacon(payload: Record<string, string>) {
  try {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Silently ignore — analytics should never break the app
  }
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const lastTime = useRef(0);
  const referrerSent = useRef(false);

  // Track page views on pathname change
  useEffect(() => {
    if (!pathname) return;

    const now = Date.now();
    // Debounce: skip duplicate path within 1 second
    if (pathname === lastPath.current && now - lastTime.current < 1000) return;

    lastPath.current = pathname;
    lastTime.current = now;

    const payload: Record<string, string> = {
      type: 'pageview',
      path: pathname,
      device: getDeviceCategory(),
    };

    // Send referrer only on first page load
    if (!referrerSent.current) {
      referrerSent.current = true;
      const referrer = getReferrerDomain();
      if (referrer) {
        payload.referrer = referrer;
      }
    }

    sendBeacon(payload);
  }, [pathname]);

  const trackEvent = useCallback((name: string) => {
    sendBeacon({ type: 'event', name });
  }, []);

  return (
    <AnalyticsContext.Provider value={{ trackEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
}
