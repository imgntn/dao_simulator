'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';
import type { MetricAlert } from '@/lib/browser/simulation-store';

const ALERT_METRICS = ['Treasury', 'Token Price', 'Gini', 'Participation', 'Members', 'Proposals'];

interface ToastProps {
  alert: MetricAlert;
  onDismiss: () => void;
}

function AlertToast({ alert, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="bg-amber-900/80 border border-amber-500/50 rounded px-3 py-2 shadow-lg animate-rise">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-sm">&#x1F514;</span>
        <div className="text-xs text-amber-200">
          <span className="font-semibold">{alert.metric}</span>
          {' '}{alert.operator}{' '}{alert.value}
        </div>
        <button
          onClick={onDismiss}
          className="ml-auto text-amber-500/60 hover:text-amber-400 text-xs"
        >
          &times;
        </button>
      </div>
    </div>
  );
}

export function MetricAlerts() {
  const { alerts, addAlert, removeAlert, checkAlerts, snapshot } = useSimulationStore();
  const [toasts, setToasts] = useState<MetricAlert[]>([]);

  // Form state
  const [metric, setMetric] = useState(ALERT_METRICS[0]);
  const [operator, setOperator] = useState<'>' | '<'>('>');
  const [value, setValue] = useState('');

  // Check alerts on each new snapshot
  const lastCheckedStep = useRef(-1);
  useEffect(() => {
    if (!snapshot || snapshot.step === lastCheckedStep.current) return;
    lastCheckedStep.current = snapshot.step;
    const triggered = checkAlerts(snapshot);
    if (triggered.length > 0) {
      setToasts(prev => [...prev, ...triggered]);
    }
  }, [snapshot, checkAlerts]);

  const handleAdd = useCallback(() => {
    const v = parseFloat(value);
    if (isNaN(v)) return;
    addAlert({ metric, operator, value: v });
    setValue('');
  }, [metric, operator, value, addAlert]);

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-auto">
        {toasts.map((t, i) => (
          <AlertToast
            key={t.id + i}
            alert={t}
            onDismiss={() => setToasts(prev => prev.filter((_, j) => j !== i))}
          />
        ))}
      </div>

      {/* Alerts content */}
      <div className="px-4 pb-3 space-y-2">
        {/* Add alert form */}
        <div className="flex gap-1.5 items-center">
          <select
            value={metric}
            onChange={e => setMetric(e.target.value)}
            className="flex-1 bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-2 py-1 text-xs focus:outline-none"
          >
            {ALERT_METRICS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={operator}
            onChange={e => setOperator(e.target.value as '>' | '<')}
            className="w-10 bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-1 py-1 text-xs text-center focus:outline-none"
          >
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
          </select>
          <input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="value"
            className="w-16 bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-[var(--sim-accent-ring)]"
          />
          <button
            onClick={handleAdd}
            className="px-2 py-1 text-xs rounded bg-[var(--sim-accent-bold)] text-white hover:bg-[var(--sim-accent-hover)]"
          >
            +
          </button>
        </div>

        {/* Active alerts */}
        {alerts.length > 0 && (
          <div className="space-y-1">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                  alert.triggered
                    ? 'bg-amber-900/20 border border-amber-600/30 text-amber-300'
                    : 'bg-[var(--sim-border)]/50 text-[var(--sim-text-muted)]'
                }`}
              >
                <span>
                  {alert.metric} {alert.operator} {alert.value}
                  {alert.triggered && ' (triggered)'}
                </span>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="text-[var(--sim-text-muted)] hover:text-red-400 ml-2"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {alerts.length === 0 && (
          <div className="text-[10px] text-[var(--sim-text-muted)] text-center py-1">
            No alerts configured
          </div>
        )}
      </div>
    </>
  );
}
