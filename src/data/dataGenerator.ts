import type { RawMetricPoint, TrainingRunFull, TrainingRunMeta } from '../types/run';

// Детерминированный PRNG (Mulberry32), чтобы данные воспроизводились в тестах
function createRng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateNormalPoints(count: number, seed: number, baseLoss = 2.8, decay = 0.002): RawMetricPoint[] {
  const rng = createRng(seed);
  const points: RawMetricPoint[] = [];

  for (let i = 0; i < count; i++) {
    const step = i * 10;
    const noise = (rng() - 0.5) * 0.08 * Math.exp(-i * decay * 0.5);
    const loss = Math.max(0.05, baseLoss * Math.exp(-i * decay) + 0.15 + noise);
    // Cosine annealing для learning rate
    const lr = 3e-4 * (0.1 + 0.9 * 0.5 * (1 + Math.cos((Math.PI * i) / count)));
    const grad_norm = Math.max(0.01, 1.2 * Math.exp(-i * decay * 0.7) + (rng() - 0.4) * 0.25);

    points.push({ step, loss, lr, grad_norm });
  }

  return points;
}

export const RUN_METADATA_LIST: TrainingRunMeta[] = [
  {
    id: 'run-01',
    name: 'soup-llm-7b-baseline',
    model: 'Soup-7B',
    status: 'completed',
    createdAt: '2026-11-12T08:00:00Z',
    costUsd: 480,
    totalRawPoints: 2000,
    description: 'Clean baseline run with cosine LR decay.',
  },
  {
    id: 'run-02',
    name: 'soup-llm-7b-nan-explosion',
    model: 'Soup-7B',
    status: 'failed',
    createdAt: '2026-11-12T10:15:00Z',
    costUsd: 510,
    totalRawPoints: 1500,
    description: 'Gradient explosion causing NaN and Infinity in loss.',
    anomalyTag: 'nan_inf',
  },
  {
    id: 'run-03',
    name: 'soup-vlm-1m-needle-spike',
    model: 'Soup-VLM-Large',
    status: 'warning',
    createdAt: '2026-11-12T12:30:00Z',
    costUsd: 500,
    totalRawPoints: 1_000_000,
    description: '1,000,000 steps with a single massive loss/grad spike in the middle.',
    anomalyTag: '1m_spike',
  },
  {
    id: 'run-04',
    name: 'soup-7b-out-of-order-dups',
    model: 'Soup-7B',
    status: 'warning',
    createdAt: '2026-11-12T14:00:00Z',
    costUsd: 320,
    totalRawPoints: 1200,
    description: 'Async worker flush produced unsorted steps and duplicate step entries.',
    anomalyTag: 'duplicates_unsorted',
  },
  {
    id: 'run-05',
    name: 'soup-7b-telemetry-gaps',
    model: 'Soup-7B',
    status: 'warning',
    createdAt: '2026-11-12T15:45:00Z',
    costUsd: 410,
    totalRawPoints: 1000,
    description: 'Network partition caused missing step intervals (gaps) in telemetry.',
    anomalyTag: 'gaps',
  },
  {
    id: 'run-06',
    name: 'soup-3b-high-lr-diverge',
    model: 'Soup-3B',
    status: 'failed',
    createdAt: '2026-11-12T17:10:00Z',
    costUsd: 290,
    totalRawPoints: 1800,
    description: 'Loss diverges rapidly after step 900.',
    anomalyTag: 'diverging',
  },
  // Остальные 14 запусков (с разными параметрами)
  ...Array.from({ length: 14 }, (_, idx): TrainingRunMeta => {
    const num = idx + 7;
    const id = `run-${String(num).padStart(2, '0')}`;
    const isRunning = num === 20;
    return {
      id,
      name: `soup-exp-${num}-ablation`,
      model: num % 2 === 0 ? 'Soup-7B' : 'Soup-3B',
      status: isRunning ? 'running' : 'completed',
      createdAt: new Date(Date.UTC(2026, 10, 13, idx, 20, 0)).toISOString(),
      costUsd: 150 + num * 18,
      totalRawPoints: 1500 + idx * 250,
      description: `Ablation experiment #${num} with standard warmup and weight decay.`,
    };
  }),
];

/**
 * Генерирует полный набор точек для конкретного запуска по запросу
 * (чтобы не держать 1M точек в памяти для неактивных запусков)
 */
export function generateRunData(runId: string): TrainingRunFull {
  const meta = RUN_METADATA_LIST.find((r) => r.id === runId);
  if (!meta) {
    throw new Error(`Run with id "${runId}" not found`);
  }

  const seed = parseInt(runId.replace(/\D/g, ''), 10) * 101;

  // Кейс 1: NaN и Infinity в loss
  if (meta.anomalyTag === 'nan_inf') {
    const pts = generateNormalPoints(meta.totalRawPoints, seed);
    for (let i = 600; i < 640; i++) {
      pts[i].loss = i % 2 === 0 ? Number.NaN : Number.POSITIVE_INFINITY;
      pts[i].grad_norm = Number.NaN;
    }
    pts[950].loss = Number.NEGATIVE_INFINITY;
    pts[1100].loss = Number.NaN;
    return { ...meta, points: pts };
  }

  // Кейс 2: 1 000 000 точек + один резкий выброс в середине (step = 500,000)
  if (meta.anomalyTag === '1m_spike') {
    const count = 1_000_000;
    const pts = new Array<RawMetricPoint>(count);
    const rng = createRng(seed);

    for (let i = 0; i < count; i++) {
      const progress = i / count;
      const noise = (rng() - 0.5) * 0.04;
      let loss = 2.4 * Math.exp(-progress * 3.2) + 0.18 + noise;
      let grad_norm = 0.8 * Math.exp(-progress * 2.0) + 0.1 + (rng() - 0.5) * 0.05;
      const lr = 2e-4 * (1 - progress * 0.85);

      // Одиночный резкий выброс ровно в середине
      if (i === 500_000) {
        loss = 48.75;
        grad_norm = 142.3;
      }

      pts[i] = { step: i, loss, lr, grad_norm };
    }
    return { ...meta, points: pts };
  }

  // Кейс 3: Неотсортированные шаги и дубликаты
  if (meta.anomalyTag === 'duplicates_unsorted') {
    const pts = generateNormalPoints(meta.totalRawPoints, seed);
    // Добавляем конфликтующие дубликаты с другими значениями
    pts.push({ step: 3000, loss: 4.95, lr: 3e-4, grad_norm: 5.2 });
    pts.push({ step: 3000, loss: 1.42, lr: 2.8e-4, grad_norm: 0.9 });
    pts.push({ step: 6500, loss: 3.8, lr: 2e-4, grad_norm: 4.1 });

    // Перемешиваем часть массива (неотсортированные шаги)
    const rng = createRng(seed + 999);
    for (let i = pts.length - 1; i > 0; i--) {
      if (rng() < 0.25) {
        const j = Math.floor(rng() * (i + 1));
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
    }
    return { ...meta, totalRawPoints: pts.length, points: pts };
  }

  // Кейс 4: Пропуски (gaps) в шагах
  if (meta.anomalyTag === 'gaps') {
    const pts = generateNormalPoints(meta.totalRawPoints, seed);
    // Вырезаем куски с шага 2500 по 4200 и с 6000 по 7800
    const filtered = pts.filter(
      (p) => (p.step < 2500 || p.step > 4200) && (p.step < 6000 || p.step > 7800)
    );
    return { ...meta, totalRawPoints: filtered.length, points: filtered };
  }

  // Кейс 5: Расходящийся loss (Diverging)
  if (meta.anomalyTag === 'diverging') {
    const pts = generateNormalPoints(meta.totalRawPoints, seed);
    for (let i = 900; i < pts.length; i++) {
      const k = (i - 900) / 100;
      pts[i].loss = pts[899].loss + Math.pow(k, 2.1) * 0.45;
      pts[i].grad_norm = 1.5 + Math.pow(k, 1.8) * 1.2;
    }
    return { ...meta, points: pts };
  }

  // Обычные запуски
  const idx = parseInt(runId.replace(/\D/g, ''), 10);
  const pts = generateNormalPoints(meta.totalRawPoints, seed, 2.5 + (idx % 4) * 0.3, 0.0018);
  return { ...meta, points: pts };
}