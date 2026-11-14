import { describe, it, expect } from 'vitest';
import { sanitizePoints, downsampleMinMax, calculateSummary } from './dataProcessor';
import type { RawMetricPoint } from '../types/run';

describe('Data Processor & Truthfulness Tests', () => {
  it('should replace NaN and Infinity with null instead of drawing them as 0', () => {
    const raw: RawMetricPoint[] = [
      { step: 10, loss: 2.5, lr: 0.001, grad_norm: 1.0 },
      { step: 20, loss: Number.NaN, lr: 0.001, grad_norm: Number.POSITIVE_INFINITY },
      { step: 30, loss: 2.1, lr: 0.0009, grad_norm: 0.8 },
    ];

    const cleaned = sanitizePoints(raw);

    expect(cleaned[1].loss).toBeNull();
    expect(cleaned[1].grad_norm).toBeNull();
    expect(cleaned[1].loss).not.toBe(0);
  });

  it('should handle and sort unsorted steps and resolve duplicates', () => {
    const raw: RawMetricPoint[] = [
      { step: 30, loss: 1.5, lr: 0.001, grad_norm: 1.0 },
      { step: 10, loss: 2.8, lr: 0.001, grad_norm: 1.2 },
      { step: 30, loss: 1.2, lr: 0.0008, grad_norm: 0.9 }, 
      { step: 20, loss: 2.0, lr: 0.001, grad_norm: 1.1 },
    ];

    const cleaned = sanitizePoints(raw);

    expect(cleaned[0].step).toBe(10);
    expect(cleaned[1].step).toBe(20);
    expect(cleaned[2].step).toBe(30);
    expect(cleaned[2].loss).toBe(1.2);
    expect(cleaned.length).toBe(3);
  });

  it('should preserve single outlier spikes during Min-Max downsampling', () => {
    const raw: RawMetricPoint[] = Array.from({ length: 10000 }, (_, i) => ({
      step: i * 10,
      loss: 1.0 + Math.sin(i / 100) * 0.1,
      lr: 0.001,
      grad_norm: 0.5,
    }));

    raw[5000].loss = 99.9;

    const cleaned = sanitizePoints(raw);
    const downsampled = downsampleMinMax(cleaned, 200);

    const hasSpike = downsampled.some((p) => p.loss === 99.9);
    expect(hasSpike).toBe(true);
  });

  it('should correctly calculate summary metrics', () => {
    const cleaned = [
      { step: 10, loss: 3.0, lr: 0.001, grad_norm: 1.0 },
      { step: 20, loss: 1.0, lr: 0.001, grad_norm: 2.0 },
      { step: 30, loss: null, lr: 0.001, grad_norm: 1.5 },
    ];

    const summary = calculateSummary(cleaned);

    expect(summary.minLoss).toBe(1.0);
    expect(summary.finalLoss).toBe(null as any);
    expect(summary.maxGradNorm).toBe(2.0);
    expect(summary.nanCount).toBe(1);
    expect(summary.totalPoints).toBe(3);
  });
});