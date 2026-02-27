interface SectionHeadingProps {
  id?: string;
  title: string;
  subtitle?: string;
}

export function SectionHeading({ id, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <h2 id={id} className="font-serif-display text-2xl text-[var(--text-heading)] sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
    </div>
  );
}
