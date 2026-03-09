'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSimulationStore } from '@/lib/browser/simulation-store';

interface AnnotationFormProps {
  step: number;
  onSave: (text: string) => void;
  onCancel: () => void;
  position: { x: number; y: number };
}

function AnnotationForm({ step, onSave, onCancel, position }: AnnotationFormProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSave(text.trim());
    }
  };

  return (
    <div
      className="absolute z-50 bg-[var(--sim-surface)] border border-[var(--sim-border)] rounded shadow-lg p-2"
      style={{ left: position.x, top: position.y - 60 }}
    >
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Note at step ${step}`}
          className="w-40 px-2 py-1 text-xs bg-[var(--sim-border)] border border-[var(--sim-border-strong)] rounded text-[var(--sim-text)] placeholder:text-[var(--sim-text-muted)] focus:outline-none focus:border-[var(--sim-accent-ring)]"
          maxLength={100}
        />
        <button
          type="submit"
          className="px-2 py-1 text-xs rounded bg-[var(--sim-accent-bold)] text-white hover:bg-[var(--sim-accent-hover)]"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-xs rounded text-[var(--sim-text-muted)] hover:text-[var(--sim-text-secondary)]"
        >
          &times;
        </button>
      </form>
    </div>
  );
}

interface AnnotationMarkerProps {
  annotation: { id: string; step: number; text: string };
  position: number; // percentage position on timeline
  onDelete: (id: string) => void;
}

function AnnotationMarker({ annotation, position, onDelete }: AnnotationMarkerProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="absolute -top-3 cursor-pointer"
      style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Diamond marker */}
      <div
        className="w-2.5 h-2.5 rotate-45"
        style={{ backgroundColor: '#f59e0b' }}
      />

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[var(--sim-surface)] border border-[var(--sim-border)] rounded px-2 py-1 shadow-lg whitespace-nowrap z-50">
          <div className="text-[10px] text-[#f59e0b] font-mono mb-0.5">Step {annotation.step}</div>
          <div className="text-xs text-[var(--sim-text-secondary)]">{annotation.text}</div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(annotation.id); }}
            className="text-[10px] text-red-400 hover:text-red-300 mt-0.5"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/** Enhanced TimeScrubber with annotation support */
export function AnnotatedTimeScrubber() {
  const history = useSimulationStore(s => s.history);
  const viewingStep = useSimulationStore(s => s.viewingStep);
  const setViewingStep = useSimulationStore(s => s.setViewingStep);
  const snapshot = useSimulationStore(s => s.snapshot);
  const status = useSimulationStore(s => s.status);
  const pause = useSimulationStore(s => s.pause);
  const annotations = useSimulationStore(s => s.annotations);
  const addAnnotation = useSimulationStore(s => s.addAnnotation);
  const removeAnnotation = useSimulationStore(s => s.removeAnnotation);

  const [addingAt, setAddingAt] = useState<{ step: number; x: number; y: number } | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const isLive = viewingStep === null;
  const currentStep = viewingStep ?? snapshot?.step ?? 0;
  const minStep = history.length > 0 ? history[0].step : 0;
  const maxStep = history.length > 0 ? history[history.length - 1].step : 0;

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const step = parseInt(e.target.value);
      if (status === 'running') {
        pause();
      }
      setViewingStep(step);
    },
    [status, pause, setViewingStep]
  );

  const goLive = useCallback(() => {
    setViewingStep(null);
  }, [setViewingStep]);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!scrubberRef.current) return;
    // Double-click to add annotation
    if (e.detail === 2) {
      const rect = scrubberRef.current.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const step = Math.round(minStep + pct * (maxStep - minStep));
      setAddingAt({ step, x: e.clientX - rect.left, y: rect.top });
    }
  }, [minStep, maxStep]);

  const handleSaveAnnotation = useCallback((text: string) => {
    if (addingAt) {
      addAnnotation(addingAt.step, text);
      setAddingAt(null);
    }
  }, [addingAt, addAnnotation]);

  if (history.length < 2) return null;

  const range = maxStep - minStep || 1;

  return (
    <div
      ref={scrubberRef}
      className="relative flex items-center gap-2 px-3 py-1.5 bg-[var(--sim-bg)]/80 backdrop-blur-sm border-t border-[var(--sim-border)]"
      onClick={handleTimelineClick}
    >
      <button
        onClick={goLive}
        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
          isLive
            ? 'bg-green-600/30 text-green-400 border border-green-500/50 animate-pulse'
            : 'text-[var(--sim-text-muted)] hover:text-green-400 border border-transparent hover:border-green-500/30'
        }`}
      >
        LIVE
      </button>

      <div className="relative flex-1">
        {/* Annotation markers */}
        {annotations.map(ann => {
          const pct = ((ann.step - minStep) / range) * 100;
          return (
            <AnnotationMarker
              key={ann.id}
              annotation={ann}
              position={pct}
              onDelete={removeAnnotation}
            />
          );
        })}

        <input
          type="range"
          min={minStep}
          max={maxStep}
          value={currentStep}
          onChange={handleScrub}
          className="w-full h-1 bg-[var(--sim-border-strong)] rounded-lg appearance-none cursor-pointer accent-[var(--sim-accent-ring)]"
        />
      </div>

      <span className="text-[10px] font-mono text-[var(--sim-text-muted)] min-w-[5ch] text-right">
        {currentStep}
      </span>

      {/* Annotation form popup */}
      {addingAt && (
        <AnnotationForm
          step={addingAt.step}
          position={{ x: addingAt.x, y: 0 }}
          onSave={handleSaveAnnotation}
          onCancel={() => setAddingAt(null)}
        />
      )}
    </div>
  );
}
