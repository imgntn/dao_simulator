'use client';

import { useState, useCallback } from 'react';

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export function BookingWidget() {
  const [form, setForm] = useState<ContactFormData>({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Send failed');
      setStatus('success');

      // Track analytics
      try {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'event', name: 'contact_submitted' }),
          keepalive: true,
        });
      } catch { /* noop */ }
    } catch {
      setStatus('error');
    }
  }, [form]);

  const updateField = (field: keyof ContactFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (status === 'success') {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/5 p-6 text-center">
        <p className="text-lg font-semibold text-[var(--accent-teal)]">Message Sent</p>
        <p className="mt-2 text-base text-[var(--text-body)]">
          Thanks for reaching out! I&rsquo;ll get back to you soon.
        </p>
        <button
          onClick={() => { setStatus('idle'); setForm({ name: '', email: '', message: '' }); }}
          className="mt-4 text-sm font-medium text-[var(--accent-teal)] underline underline-offset-4 hover:text-[var(--accent-teal-hover)]"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-warm)] p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
              Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-teal)] focus:outline-none"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-teal)] focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
            Message
          </label>
          <textarea
            required
            value={form.message}
            onChange={e => updateField('message', e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-teal)] focus:outline-none resize-none"
            placeholder="What would you like to discuss? e.g., governance mechanism design, simulation consulting, agent-based modeling..."
          />
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-400">
            Something went wrong. Please try again or email directly at hello@daosimulator.com.
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-teal)] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[var(--accent-teal-hover)] disabled:opacity-50"
        >
          {status === 'submitting' ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              Send Message
            </>
          )}
        </button>
      </form>
    </div>
  );
}
