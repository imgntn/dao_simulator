'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type FeedbackType = 'bug' | 'feature' | 'general';

const FEEDBACK_TYPES: { value: FeedbackType; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug', icon: '🐛' },
  { value: 'feature', label: 'Feature', icon: '💡' },
  { value: 'general', label: 'General', icon: '💬' },
];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded-full border border-[var(--sim-border)] text-[var(--sim-text-muted)] hover:text-[var(--sim-accent)] hover:border-[var(--sim-accent)] text-sm transition-colors flex items-center justify-center"
        title="Send Feedback"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    setStatus('sending');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email: email.trim() || undefined,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setStatus('sent');
        setTimeout(onClose, 1500);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, [type, message, email, onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="w-full max-w-md mx-4 rounded-xl border border-[var(--sim-border)] bg-[var(--sim-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sim-border)]">
          <h2 className="text-sm font-semibold text-[var(--sim-text)]">Send Feedback</h2>
          <button
            onClick={onClose}
            className="text-[var(--sim-text-muted)] hover:text-[var(--sim-text)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {status === 'sent' ? (
          <div className="px-4 py-8 text-center">
            <div className="text-2xl mb-2">✓</div>
            <p className="text-sm text-[var(--sim-text-secondary)]">Thanks for your feedback!</p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-3">
            {/* Type selector */}
            <div className="flex gap-2">
              {FEEDBACK_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  onClick={() => setType(ft.value)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    type === ft.value
                      ? 'border-[var(--sim-accent)] bg-[var(--sim-accent-bg)] text-[var(--sim-accent)]'
                      : 'border-[var(--sim-border)] text-[var(--sim-text-muted)] hover:border-[var(--sim-border-strong)]'
                  }`}
                >
                  {ft.icon} {ft.label}
                </button>
              ))}
            </div>

            {/* Message */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === 'bug'
                  ? 'What went wrong? Steps to reproduce...'
                  : type === 'feature'
                    ? 'What would make this better?'
                    : 'Any thoughts or suggestions...'
              }
              rows={4}
              className="w-full rounded-lg border border-[var(--sim-border)] bg-[var(--sim-bg)] px-3 py-2 text-sm text-[var(--sim-text)] placeholder:text-[var(--sim-text-dim)] outline-none focus:border-[var(--sim-border-focus)] resize-none"
            />

            {/* Optional email */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional, for follow-up)"
              className="w-full rounded-lg border border-[var(--sim-border)] bg-[var(--sim-bg)] px-3 py-1.5 text-sm text-[var(--sim-text)] placeholder:text-[var(--sim-text-dim)] outline-none focus:border-[var(--sim-border-focus)]"
            />

            {/* Submit */}
            <div className="flex items-center justify-between pt-1">
              {status === 'error' && (
                <p className="text-xs text-red-400">Failed to send. Try again.</p>
              )}
              <div className="ml-auto">
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || status === 'sending'}
                  className="px-4 py-1.5 rounded-lg bg-[var(--sim-accent-bold)] text-white text-sm font-medium hover:bg-[var(--sim-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {status === 'sending' ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
