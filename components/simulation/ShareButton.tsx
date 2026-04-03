'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import type { BrowserSimConfig } from '@/lib/browser/worker-protocol';

const DEFAULT_CONFIG: Partial<BrowserSimConfig> = {
  daoId: 'aave',
  seed: 42,
  stepsPerSecond: 10,
  totalSteps: 720,
  forumEnabled: true,
  blackSwanEnabled: false,
};

/** Encode non-default config values to URL search params */
function encodeConfig(config: BrowserSimConfig): string {
  const params = new URLSearchParams();

  if (config.daoId !== DEFAULT_CONFIG.daoId) params.set('dao', config.daoId);
  if (config.seed !== DEFAULT_CONFIG.seed) params.set('seed', String(config.seed));
  if (config.stepsPerSecond !== DEFAULT_CONFIG.stepsPerSecond) params.set('speed', String(config.stepsPerSecond));
  if (config.totalSteps !== DEFAULT_CONFIG.totalSteps) params.set('steps', String(config.totalSteps));
  if (config.governanceRule) params.set('gov', config.governanceRule);
  if (config.forumEnabled === false) params.set('forum', '0');
  if (config.blackSwanEnabled === true) params.set('swan', '1');
  if (config.blackSwanFrequency !== undefined && config.blackSwanFrequency !== 2) params.set('swanfreq', String(config.blackSwanFrequency));

  return params.toString();
}

/** Decode URL search params to partial config */
export function decodeConfigFromURL(): Partial<BrowserSimConfig> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const config: Partial<BrowserSimConfig> = {};

  const dao = params.get('dao');
  if (dao) config.daoId = dao;

  const seed = params.get('seed');
  if (seed) config.seed = parseInt(seed);

  const speed = params.get('speed');
  if (speed) config.stepsPerSecond = parseInt(speed);

  const steps = params.get('steps');
  if (steps) config.totalSteps = parseInt(steps);

  const gov = params.get('gov');
  if (gov) config.governanceRule = gov;

  const forum = params.get('forum');
  if (forum === '0') config.forumEnabled = false;

  const swan = params.get('swan');
  if (swan === '1') config.blackSwanEnabled = true;

  const swanfreq = params.get('swanfreq');
  if (swanfreq) config.blackSwanFrequency = parseInt(swanfreq);

  return config;
}

export function ShareButton() {
  const config = useSimulationStore(s => s.config);
  const [copied, setCopied] = useState(false);
  const { trackEvent } = useAnalytics();

  const handleShare = useCallback(() => {
    trackEvent(ANALYTICS_EVENTS.SHARE_CONFIG);
    const queryString = encodeConfig(config);
    const url = queryString
      ? `${window.location.origin}${window.location.pathname}?${queryString}`
      : `${window.location.origin}${window.location.pathname}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
    }).catch(() => {
      // Fallback: select the URL
      prompt('Copy this URL:', url);
    });
  }, [config, trackEvent]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <button
      onClick={handleShare}
      className="w-7 h-7 rounded-full border border-[var(--sim-border)] text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)] hover:border-[var(--sim-accent)] text-sm transition-colors"
      aria-label={copied ? 'Link copied to clipboard' : 'Share simulation config URL'}
      title={copied ? 'Copied!' : 'Share config URL'}
    >
      {copied ? (
        <span className="text-green-400 text-xs">&#x2713;</span>
      ) : (
        <span className="text-xs">&#x1F517;</span>
      )}
    </button>
  );
}
