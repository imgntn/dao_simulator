'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { useTooltipSettingsOptional } from '@/lib/contexts/TooltipSettingsContext';

interface TooltipProps {
  content: string;
  children: ReactNode;
  /** Show a help icon instead of wrapping children */
  showIcon?: boolean;
  /** Position of tooltip (overrides global setting) */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Maximum width of tooltip (overrides global setting) */
  maxWidth?: number;
  /** Delay before showing tooltip (overrides global setting) */
  delay?: number;
  /** Optional real-world example to show */
  example?: string;
  /** Force tooltip to show even if globally disabled */
  forceShow?: boolean;
}

export function Tooltip({
  content,
  children,
  showIcon = false,
  position: positionProp,
  maxWidth: maxWidthProp,
  delay: delayProp,
  example,
  forceShow = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get settings from context (gracefully handle missing provider)
  const settingsContext = useTooltipSettingsOptional();
  const settings = settingsContext?.settings;

  // Use prop values or fall back to settings or defaults
  const enabled = forceShow || (settings?.enabled ?? true);
  const delay = delayProp ?? (settings?.delay ?? 200);
  const position = positionProp ?? (settings?.position === 'auto' ? 'top' : settings?.position) ?? 'top';
  const maxWidth = maxWidthProp ?? (settings?.maxWidth ?? 300);
  const showExamples = settings?.showExamples ?? true;
  const showOnFocus = settings?.showOnFocus ?? true;

  const showTooltip = () => {
    if (!enabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'left':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.right + 8;
          break;
      }

      // Keep tooltip within viewport
      const padding = 10;
      if (left < padding) left = padding;
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding;
      }

      setCoords({ top, left });
    }
  }, [isVisible, position]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Hide tooltip when settings change to disabled
  useEffect(() => {
    if (!enabled && isVisible) {
      setIsVisible(false);
    }
  }, [enabled, isVisible]);

  const handleFocus = () => {
    if (showOnFocus) {
      showTooltip();
    }
  };

  const handleBlur = () => {
    if (showOnFocus) {
      hideTooltip();
    }
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={showIcon ? 'inline-flex items-center' : ''}
        tabIndex={showIcon ? 0 : undefined}
        role={showIcon ? 'button' : undefined}
        aria-describedby={isVisible ? 'tooltip' : undefined}
      >
        {showIcon ? (
          <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help rounded-full border border-gray-300 dark:border-gray-600">
            ?
          </span>
        ) : (
          children
        )}
        {!showIcon && children}
      </span>

      {isVisible && enabled && (
        <div
          ref={tooltipRef}
          role="tooltip"
          id="tooltip"
          className="fixed z-50 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-lg pointer-events-none"
          style={{
            top: coords.top,
            left: coords.left,
            maxWidth,
          }}
        >
          <div>{content}</div>
          {example && showExamples && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-700 dark:border-gray-300 text-xs text-gray-300 dark:text-gray-600">
              <span className="font-medium">Example:</span> {example}
            </div>
          )}
          <div
            className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 transform rotate-45 ${
              position === 'top'
                ? 'bottom-[-4px] left-1/2 -translate-x-1/2'
                : position === 'bottom'
                  ? 'top-[-4px] left-1/2 -translate-x-1/2'
                  : position === 'left'
                    ? 'right-[-4px] top-1/2 -translate-y-1/2'
                    : 'left-[-4px] top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </>
  );
}

/**
 * Info icon with tooltip - for adding help icons next to labels
 */
interface InfoTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  example?: string;
}

export function InfoTooltip({ content, position = 'top', example }: InfoTooltipProps) {
  return (
    <Tooltip content={content} position={position} example={example} showIcon>
      <span />
    </Tooltip>
  );
}

/**
 * Label with integrated tooltip
 */
interface LabelWithTooltipProps {
  label: string;
  tooltip: string;
  example?: string;
  htmlFor?: string;
  className?: string;
}

export function LabelWithTooltip({ label, tooltip, example, htmlFor, className = '' }: LabelWithTooltipProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
    >
      {label}
      <InfoTooltip content={tooltip} example={example} />
    </label>
  );
}

/**
 * Glossary term with tooltip - highlighted text that shows definition on hover
 */
interface GlossaryTermProps {
  term: string;
  definition: string;
  example?: string;
  children: ReactNode;
}

export function GlossaryTerm({ term, definition, example, children }: GlossaryTermProps) {
  const settingsContext = useTooltipSettingsOptional();
  const persistentGlossary = settingsContext?.settings?.persistentGlossary ?? false;

  return (
    <Tooltip content={`${term}: ${definition}`} example={example}>
      <span
        className={`${
          persistentGlossary
            ? 'border-b border-dashed border-blue-400 dark:border-blue-500 cursor-help'
            : 'cursor-help'
        }`}
      >
        {children}
      </span>
    </Tooltip>
  );
}
