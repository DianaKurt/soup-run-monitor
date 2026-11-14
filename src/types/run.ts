export interface RawMetricPoint {
    step: number;
    loss: number;
    lr: number;
    grad_norm: number;
  }
  
  export type RunStatus = 'running' | 'completed' | 'failed' | 'warning';
  
  export interface TrainingRunMeta {
    id: string;
    name: string;
    model: string;
    status: RunStatus;
    createdAt: string; // ISO string
    costUsd: number;
    totalRawPoints: number;
    description: string;
    /** Флаг для преднамеренно сломанных сценариев в датасете */
    anomalyTag?: 'nan_inf' | 'duplicates_unsorted' | 'gaps' | '1m_spike' | 'diverging';
  }
  
  export interface TrainingRunFull extends TrainingRunMeta {
    points: RawMetricPoint[];
  }