import type { VisualQuality, VisualSceneDraw } from './visual-layout-protocol';

export type SanctumRendererMode = 'three' | 'canvas2d';

export type VisualSceneDrawStats = VisualSceneDraw['stats'];

export type CanvasRendererStats = VisualSceneDrawStats & {
  renderer: 'canvas2d';
};

export type ThreeRendererStats = VisualSceneDrawStats & {
  renderer: 'three';
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  bufferUpdateMs: number;
  renderMs: number;
  renderFps: number;
};

export type SanctumRendererStats = CanvasRendererStats | ThreeRendererStats;

export interface PerformanceAverages {
  pageFps: number;
  frameMs: number;
  simRate: number;
  simMs: number;
  layoutMs: number;
  bufferUpdateMs: number;
  renderMs: number;
  quality: VisualQuality;
}

export type PerformanceHealth = 'good' | 'watch' | 'critical';

export function averagePerformanceSamples(samples: PerformanceAverages[]): PerformanceAverages {
  if (samples.length === 0) {
    return {
      pageFps: 0,
      frameMs: 0,
      simRate: 0,
      simMs: 0,
      layoutMs: 0,
      bufferUpdateMs: 0,
      renderMs: 0,
      quality: 'high',
    };
  }

  const totals = samples.reduce((acc, sample) => ({
    pageFps: acc.pageFps + sample.pageFps,
    frameMs: acc.frameMs + sample.frameMs,
    simRate: acc.simRate + sample.simRate,
    simMs: acc.simMs + sample.simMs,
    layoutMs: acc.layoutMs + sample.layoutMs,
    bufferUpdateMs: acc.bufferUpdateMs + sample.bufferUpdateMs,
    renderMs: acc.renderMs + sample.renderMs,
  }), {
    pageFps: 0,
    frameMs: 0,
    simRate: 0,
    simMs: 0,
    layoutMs: 0,
    bufferUpdateMs: 0,
    renderMs: 0,
  });

  const divisor = samples.length;
  return {
    pageFps: totals.pageFps / divisor,
    frameMs: totals.frameMs / divisor,
    simRate: totals.simRate / divisor,
    simMs: totals.simMs / divisor,
    layoutMs: totals.layoutMs / divisor,
    bufferUpdateMs: totals.bufferUpdateMs / divisor,
    renderMs: totals.renderMs / divisor,
    quality: samples[samples.length - 1].quality,
  };
}

export function getPerformanceHealth(avg: PerformanceAverages): {
  health: PerformanceHealth;
  reason: string;
} {
  if (avg.pageFps > 0 && avg.pageFps < 24) {
    return { health: 'critical', reason: 'Page FPS below 24' };
  }
  if (avg.simMs > 32) {
    return { health: 'critical', reason: 'Simulation step above 32ms' };
  }
  if (avg.layoutMs > 12) {
    return { health: 'watch', reason: 'Visual layout above 12ms' };
  }
  if (avg.bufferUpdateMs > 8) {
    return { health: 'watch', reason: 'GPU buffer update above 8ms' };
  }
  if (avg.renderMs > 8) {
    return { health: 'watch', reason: 'WebGL render above 8ms' };
  }
  if (avg.pageFps > 0 && avg.pageFps < 45) {
    return { health: 'watch', reason: 'Page FPS below 45' };
  }
  return { health: 'good', reason: 'Within target' };
}
