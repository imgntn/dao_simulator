interface InfoCardProps {
  label: string;
  children: React.ReactNode;
}

export function InfoCard({ label, children }: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-warm)] p-4 sm:p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--accent-gold)]">
        {label}
      </p>
      <div className="mt-2 text-[1.05rem] leading-relaxed text-[var(--text-body-secondary)]">
        {children}
      </div>
    </div>
  );
}
