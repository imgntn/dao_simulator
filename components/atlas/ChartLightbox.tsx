'use client';

import { useRef, useCallback, type ReactNode } from 'react';

interface ChartLightboxProps {
  children: ReactNode;
}

export function ChartLightbox({ children }: ChartLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      // Close only if clicking the backdrop (the dialog element itself), not its content
      if (e.target === dialogRef.current) {
        dialogRef.current?.close();
      }
    },
    [],
  );

  return (
    <>
      {/* Inline preview — click to enlarge */}
      <button
        type="button"
        onClick={open}
        className="group w-full cursor-zoom-in rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-3 text-left transition-shadow hover:shadow-md"
      >
        <div className="pointer-events-none">{children}</div>
        <p className="mt-2 text-center text-xs text-[var(--text-muted)] opacity-70 transition-opacity group-hover:opacity-100">
          Click to enlarge
        </p>
      </button>

      {/* Lightbox dialog */}
      <dialog
        ref={dialogRef}
        className="chart-lightbox-dialog"
        onClick={handleBackdropClick}
      >
        <div className="relative rounded-2xl border border-[var(--border-default)] bg-white p-4 shadow-xl sm:p-6">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-warm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--border-default)] hover:text-[var(--text-heading)]"
            aria-label="Close"
          >
            &times;
          </button>
          <div className="mt-2">{children}</div>
        </div>
      </dialog>
    </>
  );
}
