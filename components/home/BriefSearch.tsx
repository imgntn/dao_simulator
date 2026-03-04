'use client';

interface BriefSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function BriefSearch({ value, onChange }: BriefSearchProps) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search briefs..."
        aria-label="Search research briefs"
        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-warm)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-muted)] transition focus:border-[var(--accent-teal)] focus:outline-none"
      />
    </div>
  );
}
