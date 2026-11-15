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
export function calculateSummary(points: CleanMetricPoint[]) {
    if (points.length === 0) {
      return { minLoss: 0, finalLoss: null, maxGradNorm: 0, nanCount: 0, totalPoints: 0 };
    }
  
    const validLossPoints = points.filter((p) => p.loss !== null);
  
    // Безопасный поиск minLoss без деструктуризации (...)
    let minLoss = 0;
    if (validLossPoints.length > 0) {
      minLoss = validLossPoints.reduce((min, p) => (p.loss! < min ? p.loss! : min), validLossPoints[0].loss!);
    }
  
    // Безопасный поиск maxGradNorm без деструктуризации (...)
    let maxGradNorm = 0;
    if (points.length > 0) {
      maxGradNorm = points.reduce((max, p) => {
        const val = p.grad_norm ?? 0;
        return val > max ? val : max;
      }, 0);
    }
  
    const lastPoint = points[points.length - 1];
    const finalLoss = lastPoint ? lastPoint.loss : null;
  
    const nanCount = points.filter(
      (p) => p.loss === null || p.lr === null || p.grad_norm === null
    ).length;
  
    return {
      minLoss: isFinite(minLoss) ? minLoss : 0,
      finalLoss,
      maxGradNorm: isFinite(maxGradNorm) ? maxGradNorm : 0,
      nanCount,
      totalPoints: points.length,
    };
  }