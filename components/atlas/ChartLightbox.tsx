'use client';

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

interface ChartLightboxProps {
  children: ReactNode;
}

export function ChartLightbox({ children }: ChartLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    dialogRef.current?.showModal();
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
    setIsOpen(false);
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        close();
      }
    },
    [close],
  );

  // Clone the inline SVG into the dialog when open (avoids double-rendering children)
  useEffect(() => {
    if (isOpen && sourceRef.current && targetRef.current) {
      targetRef.current.innerHTML = '';
      const clone = sourceRef.current.cloneNode(true) as HTMLElement;
      clone.classList.remove('pointer-events-none');
      targetRef.current.appendChild(clone);
    }
  }, [isOpen]);

  return (
    <>
      {/* Inline preview — click to enlarge */}
      <button
        type="button"
        onClick={open}
        className="group w-full cursor-zoom-in rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-3 text-left transition-shadow hover:shadow-md"
      >
        <div ref={sourceRef} className="pointer-events-none">{children}</div>
        <p className="mt-2 text-center text-xs text-[var(--text-muted)] opacity-70 transition-opacity group-hover:opacity-100">
          Click to enlarge
        </p>
      </button>

      {/* Lightbox dialog — content cloned from inline on open */}
      <dialog
        ref={dialogRef}
        className="chart-lightbox-dialog"
        onClick={handleBackdropClick}
      >
        <div className="relative rounded-2xl border border-[var(--border-default)] bg-white p-4 shadow-xl sm:p-6">
          <button
            type="button"
            onClick={close}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-warm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--border-default)] hover:text-[var(--text-heading)]"
            aria-label="Close"
          >
            &times;
          </button>
          <div ref={targetRef} className="chart-gallery-item mt-2" />
        </div>
      </dialog>
    </>
  );
}
