import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { BackToTop } from '../ui/BackToTop';

interface PageShellProps {
  children: React.ReactNode;
  variant?: 'atlas' | 'console';
}

export function PageShell({ children, variant = 'atlas' }: PageShellProps) {
  const isConsole = variant === 'console';

  return (
    <div className={isConsole ? 'theme-console' : ''}>
      <div
        className={`relative min-h-screen overflow-hidden ${
          isConsole ? 'bg-[var(--surface-page)] text-[var(--text-body-secondary)]' : 'text-[#1d2935]'
        }`}
      >
        {!isConsole && (
          <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_10%_12%,rgba(244,201,122,0.33),transparent_38%),radial-gradient(circle_at_88%_18%,rgba(87,153,167,0.24),transparent_44%),linear-gradient(180deg,#fffef9_0%,#f5efe2_52%,#ebe4d6_100%)]" />
        )}
        <SiteHeader />
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pt-12">
          {children}
          <SiteFooter />
        </div>
        <BackToTop />
      </div>
    </div>
  );
}
