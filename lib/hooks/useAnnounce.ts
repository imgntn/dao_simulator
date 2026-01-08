/**
 * Hook for making screen reader announcements
 * Uses ARIA live regions defined in the root layout
 */

import { useCallback } from 'react';

type AnnounceType = 'polite' | 'assertive';

/**
 * Announces a message to screen readers
 * @param message - The message to announce
 * @param type - 'polite' for non-urgent, 'assertive' for critical updates
 */
export function useAnnounce() {
  const announce = useCallback((message: string, type: AnnounceType = 'polite') => {
    const regionId = type === 'assertive' ? 'aria-alert-region' : 'aria-live-region';
    const region = document.getElementById(regionId);

    if (region) {
      // Clear previous announcement
      region.textContent = '';

      // Use requestAnimationFrame to ensure the DOM update is processed
      requestAnimationFrame(() => {
        region.textContent = message;
      });
    }
  }, []);

  const announcePolite = useCallback(
    (message: string) => announce(message, 'polite'),
    [announce]
  );

  const announceAssertive = useCallback(
    (message: string) => announce(message, 'assertive'),
    [announce]
  );

  return {
    announce,
    announcePolite,
    announceAssertive,
  };
}

/**
 * Common announcement helpers
 */
export const announcements = {
  simulationStarted: () => 'Simulation started',
  simulationPaused: () => 'Simulation paused',
  simulationResumed: () => 'Simulation resumed',
  simulationReset: () => 'Simulation reset',
  simulationComplete: (outcome: 'won' | 'lost') =>
    outcome === 'won' ? 'Simulation complete. Objectives achieved!' : 'Simulation ended',
  stepUpdate: (step: number) => `Step ${step}`,
  missionCompleted: (title: string) => `Mission completed: ${title}`,
  marketShock: (type: 'positive' | 'negative') =>
    type === 'positive' ? 'Positive market shock detected' : 'Negative market shock detected',
  connectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => {
    switch (status) {
      case 'connected':
        return 'Connected to simulation server';
      case 'disconnected':
        return 'Disconnected from simulation server';
      case 'connecting':
        return 'Connecting to simulation server';
    }
  },
  error: (message: string) => `Error: ${message}`,
};

export default useAnnounce;
