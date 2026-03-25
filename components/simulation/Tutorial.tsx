'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTutorialStore } from '@/lib/browser/tutorial-store';
import { useAnalytics } from '@/components/analytics/AnalyticsProvider';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

export function Tutorial() {
  const { active, currentStep, steps, next, prev, skip, start, completed } = useTutorialStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const { trackEvent } = useAnalytics();

  // Auto-start on first visit
  useEffect(() => {
    if (!completed && !active) {
      // Small delay so the page renders first
      const timer = setTimeout(() => { start(); trackEvent(ANALYTICS_EVENTS.TUTORIAL_STARTED); }, 1500);
      return () => clearTimeout(timer);
    }
  }, [completed, active, start]);

  // Find and track the target element
  useEffect(() => {
    if (!active) return;
    const step = steps[currentStep];
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }

    // Update on resize
    const onResize = () => {
      const el2 = document.querySelector(step.targetSelector!);
      if (el2) setTargetRect(el2.getBoundingClientRect());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, currentStep, steps]);

  if (!active) return null;

  const step = steps[currentStep];
  const padding = 8;

  // Compute tooltip position
  const tooltipStyle: React.CSSProperties = {};
  if (targetRect) {
    switch (step.position) {
      case 'right':
        tooltipStyle.left = targetRect.right + 16;
        tooltipStyle.top = targetRect.top + targetRect.height / 2;
        tooltipStyle.transform = 'translateY(-50%)';
        break;
      case 'left':
        tooltipStyle.right = window.innerWidth - targetRect.left + 16;
        tooltipStyle.top = targetRect.top + targetRect.height / 2;
        tooltipStyle.transform = 'translateY(-50%)';
        break;
      case 'top':
        tooltipStyle.left = targetRect.left + targetRect.width / 2;
        tooltipStyle.bottom = window.innerHeight - targetRect.top + 16;
        tooltipStyle.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        tooltipStyle.left = targetRect.left + targetRect.width / 2;
        tooltipStyle.top = targetRect.bottom + 16;
        tooltipStyle.transform = 'translateX(-50%)';
        break;
    }
  } else {
    tooltipStyle.left = '50%';
    tooltipStyle.top = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  // Spotlight clip-path
  const clipPath = targetRect
    ? `polygon(
        0% 0%, 0% 100%,
        ${targetRect.left - padding}px 100%,
        ${targetRect.left - padding}px ${targetRect.top - padding}px,
        ${targetRect.right + padding}px ${targetRect.top - padding}px,
        ${targetRect.right + padding}px ${targetRect.bottom + padding}px,
        ${targetRect.left - padding}px ${targetRect.bottom + padding}px,
        ${targetRect.left - padding}px 100%,
        100% 100%, 100% 0%
      )`
    : undefined;

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Tutorial">
      {/* Dark overlay with cutout */}
      <div
        className="absolute inset-0 bg-black/60"
        style={clipPath ? { clipPath } : undefined}
        onClick={skip}
      />

      {/* Spotlight border (optional) */}
      {targetRect && (
        <div
          className="absolute border-2 border-[var(--sim-accent)] rounded pointer-events-none"
          style={{
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute bg-[var(--sim-surface)] border border-[var(--sim-border)] rounded-lg shadow-2xl p-4 max-w-sm z-[201]"
        style={tooltipStyle}
      >
        <div className="text-xs text-[var(--sim-accent)] font-mono mb-1">
          {currentStep + 1} / {steps.length}
        </div>
        <h4 className="text-sm font-semibold text-[var(--sim-text)] mb-1">
          {step.title}
        </h4>
        <p className="text-xs text-[var(--sim-text-secondary)] leading-relaxed mb-3">
          {step.description}
        </p>

        <div className="flex items-center justify-between">
          <button
            onClick={() => { skip(); trackEvent(ANALYTICS_EVENTS.TUTORIAL_SKIPPED); }}
            className="text-[10px] text-[var(--sim-text-muted)] hover:text-[var(--sim-text-secondary)]"
          >
            Skip tutorial
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={prev}
                className="px-2.5 py-1 text-xs rounded bg-[var(--sim-border)] hover:bg-[var(--sim-surface-hover)] text-[var(--sim-text-secondary)]"
              >
                Back
              </button>
            )}
            <button
              onClick={() => { if (currentStep >= steps.length - 1) trackEvent(ANALYTICS_EVENTS.TUTORIAL_COMPLETED); next(); }}
              className="px-2.5 py-1 text-xs rounded bg-[var(--sim-accent-bold)] hover:bg-[var(--sim-accent-hover)] text-white"
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
