'use client';

import { useLocale } from '@/lib/i18n/locale-context';

export default function Loading() {
  const { messages: m } = useLocale();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)]">
      <div className="text-center">
        <div className="relative mx-auto w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-[var(--border-default)]" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--accent-teal)] animate-spin" />
        </div>

        <h2 className="text-xl font-semibold text-[var(--text-heading)] mb-2">{m.loadingStates.loading}</h2>
        <p className="text-[var(--text-body)] text-sm">{m.loadingStates.pleaseWait}</p>
      </div>
    </div>
  );
}
