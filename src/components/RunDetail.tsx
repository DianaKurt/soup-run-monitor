import React, { useEffect, useMemo, useState } from 'react';
import { generateRunData } from '../data/dataGenerator';
import type { TrainingRunFull } from '../types/run';
import { calculateSummary, downsampleMinMax, sanitizePoints } from '../utils/dataProcessor';
import { RunChart } from './RunChart';

interface RunDetailProps {
  runId: string;
  onBack: () => void;
}

export const RunDetail: React.FC<RunDetailProps> = ({ runId, onBack }) => {
  const [fullRun, setFullRun] = useState<TrainingRunFull | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isKilled, setIsKilled] = useState<boolean>(false);
  const [showKillModal, setShowKillModal] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIsKilled(false);

    const timer = setTimeout(() => {
      try {
        const data = generateRunData(runId);
        if (!cancelled) {
          setFullRun(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error loading run data');
          setLoading(false);
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runId]);

  const cleanedPoints = useMemo(
    () => (fullRun ? sanitizePoints(fullRun.points) : []),
    [fullRun]
  );
  const summary = useMemo(() => calculateSummary(cleanedPoints), [cleanedPoints]);

  const chartPoints = useMemo(() => {
    return cleanedPoints.length > 2000 ? downsampleMinMax(cleanedPoints, 1000) : cleanedPoints;
  }, [cleanedPoints]);

  const currentStatus = isKilled ? 'failed' : fullRun?.status;

  return (
    <div className="run-detail-container">
      <button className="back-btn" onClick={onBack}>
        ← Back to Runs List
      </button>

      {loading && (
        <div className="state-box" role="status">
          <div className="spinner" />
          <p>Loading telemetry stream and sanitizing points...</p>
        </div>
      )}

      {error && (
        <div className="modal-backdrop" role="alertdialog" aria-modal="true">
          <div className="modal-card">
            <h3 className="modal-title">Failed to load training run</h3>
            <p style={{ color: '#475569', fontSize: '14px' }}>{error}</p>
            <div className="modal-actions">
              <button className="btn-primary" onClick={onBack}>
                Return to List
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && fullRun && (
        <>
          <div className="header-row">
            <div>
              <h1>{fullRun.name}</h1>
              <p className="meta-info">
                Model: <strong>{fullRun.model}</strong> · Created:{' '}
                {new Date(fullRun.createdAt).toLocaleString()} · Cost: <strong>${fullRun.costUsd}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className={`badge ${currentStatus}`}>
                {isKilled ? 'Killed' : currentStatus}
              </span>

              {currentStatus === 'running' && !isKilled && (
                <button
                  type="button"
                  onClick={() => setShowKillModal(true)}
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🛑 Kill Run (${fullRun.costUsd})
                </button>
              )}
            </div>
          </div>

          {fullRun.anomalyTag && (
            <div className="warning-banner">
              <strong>⚠️ Anomaly Detected ({fullRun.anomalyTag}):</strong> {fullRun.description}
            </div>
          )}

          <div className="summary-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <div className="card">
              <h3>Min Loss</h3>
              <p className="card-val">{summary.minLoss.toFixed(4)}</p>
            </div>
            <div className="card">
              <h3>Final Loss</h3>
              <p className="card-val">{summary.finalLoss !== null ? summary.finalLoss.toFixed(4) : 'NaN / Gap'}</p>
            </div>
            <div className="card">
              <h3>Max Grad Norm</h3>
              <p className="card-val">{summary.maxGradNorm.toFixed(2)}</p>
            </div>
            <div className="card">
              <h3>NaN / Inf Count</h3>
              <p className={`card-val ${summary.nanCount > 0 ? 'danger' : ''}`}>{summary.nanCount}</p>
            </div>
            <div className="card">
              <h3>Valid Points</h3>
              <p className="card-val">{summary.totalPoints.toLocaleString()}</p>
            </div>
            <div className="card">
              <h3>Data Quality</h3>
              <p className="card-val" style={{ color: summary.nanCount > 0 ? '#d97706' : '#16a34a' }}>
                {summary.nanCount > 0 ? 'Degraded' : '100% Clean'}
              </p>
            </div>
          </div>

          <div className="charts-grid">
            <RunChart title="Loss (Cross-Entropy)" data={chartPoints} metricKey="loss" color="#e11d48" />
            <RunChart title="Learning Rate (lr)" data={chartPoints} metricKey="lr" color="#2563eb" />
            <RunChart title="Gradient Norm (grad_norm)" data={chartPoints} metricKey="grad_norm" color="#9333ea" />
          </div>
        </>
      )}

      {/* Кастомное модальное окно для подтверждения Kill Run */}
      {showKillModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kill-detail-modal-title"
          onClick={() => setShowKillModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 id="kill-detail-modal-title" className="modal-title" style={{ color: '#dc2626' }}>
              <span>🛑</span> Abort Training Run
            </h3>
            <p style={{ margin: '8px 0 16px 0', color: '#475569', fontSize: '14px' }}>
              Are you sure you want to abort training run <strong>{runId}</strong>? Cluster resources will be released immediately.
            </p>
            <div className="modal-actions">
              <button className="action-btn" onClick={() => setShowKillModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsKilled(true);
                  setShowKillModal(false);
                }}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Yes, Kill Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};