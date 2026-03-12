'use client';

import { useRef, useCallback } from 'react';
import { useLayoutStore } from '@/lib/browser/layout-store';

interface DragState {
  panelId: string;
  startY: number;
  currentIndex: number;
}

/**
 * Custom pointer-event-based drag-and-drop for panel reordering.
 * Works on touch (Steam Deck, iPad) via pointer events.
 */
export function usePanelDragDrop(containerRef: React.RefObject<HTMLElement | null>) {
  const dragState = useRef<DragState | null>(null);
  const indicatorRef = useRef<HTMLDivElement | null>(null);

  const panelOrder = useLayoutStore(s => s.panelOrder);
  const setPanelOrder = useLayoutStore(s => s.setPanelOrder);
  const setDraggedPanel = useLayoutStore(s => s.setDraggedPanel);

  const createIndicator = useCallback(() => {
    if (indicatorRef.current) return indicatorRef.current;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;right:0;height:2px;background:#22d3ee;z-index:50;pointer-events:none;transition:top 60ms ease-out';
    indicatorRef.current = el;
    return el;
  }, []);

  const removeIndicator = useCallback(() => {
    if (indicatorRef.current?.parentNode) {
      indicatorRef.current.parentNode.removeChild(indicatorRef.current);
    }
  }, []);

  const getPanelElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-panel-id]'));
  }, [containerRef]);

  const getDropIndex = useCallback((clientY: number): number => {
    const els = getPanelElements();
    for (let i = 0; i < els.length; i++) {
      const rect = els[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return els.length;
  }, [getPanelElements]);

  const onDragStart = useCallback((panelId: string, e: React.PointerEvent) => {
    e.preventDefault();
    const idx = panelOrder.indexOf(panelId);
    if (idx === -1) return;

    dragState.current = { panelId, startY: e.clientY, currentIndex: idx };
    setDraggedPanel(panelId);

    // Add indicator to container
    const container = containerRef.current;
    if (container) {
      container.style.position = 'relative';
      const indicator = createIndicator();
      container.appendChild(indicator);
    }

    const onMove = (ev: PointerEvent) => {
      if (!dragState.current || !containerRef.current) return;
      const dropIdx = getDropIndex(ev.clientY);
      dragState.current.currentIndex = dropIdx;

      // Position indicator
      const els = getPanelElements();
      const indicator = indicatorRef.current;
      if (!indicator) return;

      if (dropIdx >= els.length) {
        const last = els[els.length - 1];
        if (last) {
          const rect = last.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          indicator.style.top = `${rect.bottom - containerRect.top}px`;
        }
      } else {
        const target = els[dropIdx];
        const rect = target.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        indicator.style.top = `${rect.top - containerRect.top}px`;
      }
    };

    const onUp = () => {
      if (dragState.current) {
        const { panelId: dragId, currentIndex: dropIdx } = dragState.current;
        const oldIdx = panelOrder.indexOf(dragId);
        if (oldIdx !== -1 && oldIdx !== dropIdx) {
          const newOrder = [...panelOrder];
          newOrder.splice(oldIdx, 1);
          const insertIdx = dropIdx > oldIdx ? dropIdx - 1 : dropIdx;
          newOrder.splice(insertIdx, 0, dragId);
          setPanelOrder(newOrder);
        }
      }

      dragState.current = null;
      setDraggedPanel(null);
      removeIndicator();
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [panelOrder, setPanelOrder, setDraggedPanel, containerRef, createIndicator, removeIndicator, getDropIndex, getPanelElements]);

  /** Move panel up/down via keyboard (Alt+Arrow) */
  const movePanel = useCallback((panelId: string, direction: 'up' | 'down') => {
    const idx = panelOrder.indexOf(panelId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= panelOrder.length) return;

    const newOrder = [...panelOrder];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    setPanelOrder(newOrder);
  }, [panelOrder, setPanelOrder]);

  return { onDragStart, movePanel };
}
