import type { Metadata } from 'next';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How DAO Simulator handles analytics, contact messages, and browser preferences.',
  robots: { index: true, follow: true },
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-[var(--text-body)] sm:px-8 sm:py-16">
      <Link href={`/${locale}`} className="text-sm font-medium text-[var(--accent-teal)] underline underline-offset-4">
        Back to DAO Simulator
      </Link>
      <h1 className="mt-6 text-4xl font-bold tracking-tight text-[var(--text-heading)]">Privacy notice</h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">Last updated: August 18, 2026</p>

      <div className="mt-10 space-y-8 text-base leading-7">
        <section>
          <h2 className="text-2xl font-semibold text-[var(--text-heading)]">What is collected</h2>
          <p className="mt-3">
            DAO Simulator records first-party, privacy-minimized page views and product events, such as opening a
            guided scenario or starting a simulation. These records may include the page path, broad device category,
            and referring domain. Event tracking does not intentionally collect message content or form field values.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[var(--text-heading)]">Contact messages</h2>
          <p className="mt-3">
            If you use the contact form, your name, email address, and message are used to respond to your request.
            They are retained only as needed to handle the conversation and protect the service from abuse.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[var(--text-heading)]">Browser storage</h2>
          <p className="mt-3">
            The site stores functional preferences in your browser, including language, theme, tutorial progress,
            and collapsed research sections. Simulation configurations may also be encoded in a URL when you choose
            to share one.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[var(--text-heading)]">Sharing and choices</h2>
          <p className="mt-3">
            Personal information is not sold. You can clear local preferences through your browser controls. To ask
            about, correct, or delete a contact message, email{' '}
            <a className="text-[var(--accent-teal)] underline underline-offset-4" href="mailto:hello@daosimulator.com">
              hello@daosimulator.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
