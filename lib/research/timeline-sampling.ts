export function sampleTimeline<T extends { step: number }>(
  timeline: readonly T[],
  stride = 1,
): T[] {
  if (!Number.isInteger(stride) || stride <= 0) {
    throw new Error('timeline stride must be a positive integer');
  }
  if (timeline.length <= 1 || stride === 1) return timeline.map(entry => ({ ...entry }));
  const sampled = timeline.filter((entry, index) =>
    index === 0 || index === timeline.length - 1 || entry.step % stride === 0
  );
  return sampled.map(entry => ({ ...entry }));
}
