'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { PrepareOptions } from '@chenglou/pretext';
import { getPretextTextLayout, type PretextTextLayoutResult } from './pretext';

interface UsePretextTextOptions {
  text: string;
  font: string;
  lineHeight: number;
  maxLines?: number;
  whiteSpace?: PrepareOptions['whiteSpace'];
  width?: number;
}

interface UsePretextTextResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  displayText: string;
  truncated: boolean;
  ready: boolean;
  layout: PretextTextLayoutResult | null;
}

export function usePretextReady() {
  const [mounted, setMounted] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof document === 'undefined' || !('fonts' in document)) {
      setFontsReady(true);
      return;
    }

    let cancelled = false;
    const finish = () => {
      if (!cancelled) setFontsReady(true);
    };

    if (document.fonts.status === 'loaded') {
      finish();
    } else {
      document.fonts.ready.then(finish).catch(finish);
    }

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  return mounted && fontsReady;
}

export function usePretextText<T extends HTMLElement>({
  text,
  font,
  lineHeight,
  maxLines,
  whiteSpace = 'normal',
  width,
}: UsePretextTextOptions): UsePretextTextResult<T> {
  const ref = useRef<T | null>(null);
  const ready = usePretextReady();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(width ?? null);

  useEffect(() => {
    if (width !== undefined) {
      setMeasuredWidth(width);
      return;
    }

    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const readWidth = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      setMeasuredWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    };

    readWidth();
    const observer = new ResizeObserver(() => readWidth());
    observer.observe(node);

    return () => observer.disconnect();
  }, [width, text]);

  const activeWidth = width ?? measuredWidth;
  const layout = useMemo(() => {
    if (!ready || activeWidth == null || activeWidth < 4) return null;
    return getPretextTextLayout({
      text,
      font,
      maxWidth: activeWidth,
      lineHeight,
      maxLines,
      whiteSpace,
    });
  }, [activeWidth, font, lineHeight, maxLines, ready, text, whiteSpace]);

  return {
    ref,
    displayText: layout?.displayText ?? text,
    truncated: layout?.truncated ?? false,
    ready: layout !== null,
    layout,
  };
}
