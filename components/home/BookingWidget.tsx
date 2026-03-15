'use client';

import { useState, useCallback } from 'react';

const CALENDAR_ID = 'zz08011230988e1ba8dc0d9ed251bc83c6e31a67192221a6f23154504fe8424ada82b550755991ab269aefd51c9c279d8cc3047f80';
const BOOKING_API = `https://calendar.zoho.com/eventreq/${CALENDAR_ID}`;
const IFRAME_URL = `https://calendar.zoho.com/eventreqForm/${CALENDAR_ID}?theme=0&l=en&tz=America%2FLos_Angeles`;

type BookingMode = 'form' | 'iframe';

interface BookingFormData {
  name: string;
  email: string;
  date: string;
  time: string;
  reason: string;
}

function formatDateForZoho(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
}

function getMinDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

const TIME_SLOTS = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
];

export function BookingWidget() {
  const [mode, setMode] = useState<BookingMode>('form');
  const [form, setForm] = useState<BookingFormData>({
    name: '',
    email: '',
    date: '',
    time: '10:00',
    reason: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    const params = new URLSearchParams({
      name: form.name,
      mailId: form.email,
      date: formatDateForZoho(form.date),
      time: form.time,
      reason: form.reason || 'Governance Advisory Consultation',
    });

    try {
      await fetch(`${BOOKING_API}?${params.toString()}`, {
        method: 'GET',
        mode: 'no-cors',
      });
      // Zoho returns opaque response with no-cors, so we treat it as success
      setStatus('success');

      // Track analytics
      try {
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'event', name: 'booking_submitted' }),
          keepalive: true,
        });
      } catch { /* noop */ }
    } catch {
      setStatus('error');
    }
  }, [form]);

  const updateField = (field: keyof BookingFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (status === 'success') {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/5 p-6 text-center">
        <p className="text-lg font-semibold text-[var(--accent-teal)]">Request Sent</p>
        <p className="mt-2 text-base text-[var(--text-body)]">
          Your consultation request has been submitted. You&rsquo;ll receive a confirmation email shortly.
        </p>
        <button
          onClick={() => { setStatus('idle'); setForm({ name: '', email: '', date: '', time: '10:00', reason: '' }); }}
          className="mt-4 text-sm font-medium text-[var(--accent-teal)] underline underline-offset-4 hover:text-[var(--accent-teal-hover)]"
        >
          Book another session
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Mode toggle */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setMode('form')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            mode === 'form'
              ? 'bg-[var(--accent-teal)] text-white'
              : 'bg-[var(--surface-warm)] text-[var(--text-body)] hover:text-[var(--accent-teal)]'
          }`}
        >
          Quick Book
        </button>
        <button
          onClick={() => setMode('iframe')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            mode === 'iframe'
              ? 'bg-[var(--accent-teal)] text-white'
              : 'bg-[var(--surface-warm)] text-[var(--text-body)] hover:text-[var(--accent-teal)]'
          }`}
        >
          Full Calendar
        </button>
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          Pacific Time (PT)
        </span>
      </div>

      {mode === 'form' ? (
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
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
                Date
              </label>
              <input
                type="date"
                required
                min={getMinDate()}
                value={form.date}
                onChange={e => updateField('date', e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-body)] focus:border-[var(--accent-teal)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
                Time (PT)
              </label>
              <select
                value={form.time}
                onChange={e => updateField('time', e.target.value)}
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-body)] focus:border-[var(--accent-teal)] focus:outline-none"
              >
                {TIME_SLOTS.map(slot => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-heading)]">
              What would you like to discuss?
            </label>
            <textarea
              value={form.reason}
              onChange={e => updateField('reason', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-body)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-teal)] focus:outline-none resize-none"
              placeholder="e.g., Governance mechanism design for our protocol, quorum analysis, agent-based modeling..."
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-400">
              Something went wrong. Please try again or email hello@daosimulator.com directly.
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                Request Consultation
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-warm)] p-1 overflow-hidden">
          <iframe
            src={IFRAME_URL}
            className="w-full rounded-xl"
            style={{ height: '500px', border: 'none' }}
            title="Schedule a consultation"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
