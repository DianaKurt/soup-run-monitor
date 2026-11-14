import type { RawMetricPoint } from '../types/run';

export interface CleanMetricPoint {
  step: number;
  loss: number | null;
  lr: number | null;
  grad_norm: number | null;
  hasAnomaly?: boolean;
}

export interface RunSummary {
  minLoss: number;
  finalLoss: number;
  maxGradNorm: number;
  nanCount: number;
  totalPoints: number;
}

export function sanitizePoints(rawPoints: RawMetricPoint[]): CleanMetricPoint[] {
  const sorted = [...rawPoints].sort((a, b) => a.step - b.step);
  const cleaned: CleanMetricPoint[] = [];
  let lastStep = -1;

  for (const p of sorted) {
    if (isNaN(p.step)) continue;

    if (p.step === lastStep && cleaned.length > 0) {
      const prev = cleaned[cleaned.length - 1];
      prev.loss = cleanNumber(p.loss);
      prev.lr = cleanNumber(p.lr);
      prev.grad_norm = cleanNumber(p.grad_norm);
      continue;
    }

    lastStep = p.step;

    const loss = cleanNumber(p.loss);
    const lr = cleanNumber(p.lr);
    const grad_norm = cleanNumber(p.grad_norm);

    const hasAnomaly = loss === null || lr === null || grad_norm === null || loss > 20 || grad_norm > 50;

    cleaned.push({
      step: p.step,
      loss,
      lr,
      grad_norm,
      hasAnomaly,
    });
  }

  return cleaned;
}

function cleanNumber(val: number): number | null {
  if (typeof val !== 'number' || Number.isNaN(val) || !Number.isFinite(val)) {
    return null;
  }
  return val;
}

/**
 * 2. Min-Max Downsampling 
 */
export function downsampleMinMax(points: CleanMetricPoint[], targetWidth: number = 800): CleanMetricPoint[] {
  if (points.length <= targetWidth * 2) {
    return points;
  }

  const bucketSize = Math.ceil(points.length / targetWidth);
  const sampled: CleanMetricPoint[] = [];

  for (let i = 0; i < points.length; i += bucketSize) {
    const bucket = points.slice(i, i + bucketSize);
    if (bucket.length === 0) continue;

    const first = bucket[0];
    const last = bucket[bucket.length - 1];

    let minPoint = first;
    let maxPoint = first;

    for (const p of bucket) {
      const l = p.loss ?? 0;
      const minL = minPoint.loss ?? 0;
      const maxL = maxPoint.loss ?? 0;

      if (l < minL) minPoint = p;
      if (l > maxL) maxPoint = p;
    }

    const bucketPoints = [first, minPoint, maxPoint, last].sort((a, b) => a.step - b.step);
    const uniqueBucketPoints = bucketPoints.filter(
      (pt, idx, arr) => idx === 0 || pt.step !== arr[idx - 1].step
    );

    sampled.push(...uniqueBucketPoints);
  }

  return sampled;
}

/**
 * Summary Cards
 */
export function calculateSummary(points: CleanMetricPoint[]): RunSummary {
  let minLoss = Infinity;
  let finalLoss = 0;
  let maxGradNorm = 0;
  let nanCount = 0;

  for (const p of points) {
    if (p.loss === null) {
      nanCount++;
    } else {
      if (p.loss < minLoss) minLoss = p.loss;
      finalLoss = p.loss;
    }

    if (p.grad_norm !== null && p.grad_norm > maxGradNorm) {
      maxGradNorm = p.grad_norm;
    }
  }

  return {
    minLoss: minLoss === Infinity ? 0 : minLoss,
    finalLoss,
    maxGradNorm,
    nanCount,
    totalPoints: points.length,
  };
}