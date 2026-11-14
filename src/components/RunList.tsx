import React, { useEffect, useState } from 'react';
import { RUN_METADATA_LIST, generateRunData } from '../data/dataGenerator';
import type { TrainingRunMeta } from '../types/run';
import { calculateSummary, sanitizePoints } from '../utils/dataProcessor';

interface RunListProps {
  onSelectRun: (runId: string) => void;
}

export const RunList: React.FC<RunListProps> = ({ onSelectRun }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'cost' | 'points'>('date');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [killedRuns, setKilledRuns] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const handleKillRun = (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to abort training run ${runId}?`)) {
      setKilledRuns((prev) => ({ ...prev, [runId]: true }));
    }
  };

  const handleRetrySync = () => {
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      setErrorMessage(null);
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 350);
    }, 500);
  };

  const filteredRuns = RUN_METADATA_LIST.filter((run) => {
    const matchesSearch =
      run.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.model.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'empty_test') return false;
    if (filter === 'anomalies') return run.anomalyTag !== undefined;
    return run.status === filter;
  }).sort((a, b) => {
    if (sortBy === 'cost') return b.costUsd - a.costUsd;
    if (sortBy === 'points') return b.totalRawPoints - a.totalRawPoints;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="run-list-container">
      <div className="top-bar">
        <div>
          <h2>Soup Training Run Monitor</h2>
          <p className="subtitle">
            Inspect model telemetry, verify data truthfulness, and control compute budget.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#065f46',
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
              }}
            />
            Cluster: Online (Node-04)
          </div>

          <button
            type="button"
            className="action-btn danger-outline"
            onClick={() =>
              setErrorMessage(
                'Telemetry stream timeout (HTTP 504): Failed to fetch latest checkpoint metadata from cluster node-04.'
              )
            }
          >
            Simulate Error Popup
          </button>
        </div>
      </div>

      <div className="controls-row">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1.5 }}>
          <input
            type="text"
            placeholder="Search runs, IDs, models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              minWidth: '240px',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
          />

          <div className="filters" role="group" aria-label="Filter training runs">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
              All ({RUN_METADATA_LIST.length})
            </button>
            <button
              className={filter === 'anomalies' ? 'active' : ''}
              onClick={() => setFilter('anomalies')}
            >
              ⚠️ Anomalies
            </button>
            <button
              className={filter === 'completed' ? 'active' : ''}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
            <button
              className={filter === 'failed' ? 'active' : ''}
              onClick={() => setFilter('failed')}
            >
              Failed
            </button>
          </div>
        </div>

        <select
          className="sort-select"
          aria-label="Sort runs"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'cost' | 'points')}
        >
          <option value="date">Sort: Newest first</option>
          <option value="cost">Sort: Highest cost ($)</option>
          <option value="points">Sort: Most points</option>
        </select>
      </div>

      {isLoading ? (
        <div className="table-wrapper" aria-busy="true" aria-label="Loading training runs">
          <table>
            <thead>
              <tr>
                <th>Run ID & Name</th>
                <th>Model</th>
                <th>Status</th>
                <th>Final Loss</th>
                <th>Cost / Progress</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="skeleton" style={{ width: '160px', height: '16px', marginBottom: '6px' }} />
                    <br />
                    <div className="skeleton" style={{ width: '70px', height: '12px' }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ width: '75px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ width: '90px', height: '24px', borderRadius: '999px' }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ width: '60px', height: '16px' }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ width: '50px', height: '16px', marginBottom: '6px' }} />
                    <br />
                    <div className="skeleton" style={{ width: '80px', height: '10px' }} />
                  </td>
                  <td>
                    <div className="skeleton" style={{ width: '85px', height: '16px' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredRuns.length === 0 ? (
        <div className="state-box" role="status">
          <h3>No training runs match your search or filter</h3>
          <p>Try clearing your search query or resetting filters.</p>
          <button
            className="btn-primary"
            onClick={() => {
              setFilter('all');
              setSearchQuery('');
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Run ID & Name</th>
                <th>Model</th>
                <th>Status</th>
                <th>Final Loss</th>
                <th>Cost / Progress</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run: TrainingRunMeta) => {
                const isKilled = killedRuns[run.id];
                const currentStatus = isKilled ? 'failed' : run.status;

                const fullData = generateRunData(run.id);
                const cleaned = sanitizePoints(fullData.points);
                const summary = calculateSummary(cleaned);

                return (
                  <tr
                    key={run.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => onSelectRun(run.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectRun(run.id);
                      }
                    }}
                    className="clickable-row"
                  >
                    <td>
                      <strong>{run.name}</strong>
                      <span className="run-id">
                        {run.id} {run.anomalyTag && `• ${run.anomalyTag}`}
                      </span>
                    </td>
                    <td>{run.model}</td>
                    <td>
                      <span className={`badge ${currentStatus}`}>
                        {isKilled ? 'Killed' : currentStatus}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>
                        {summary.finalLoss > 0 ? summary.finalLoss.toFixed(4) : 'N/A'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600 }}>${run.costUsd}</span>
                        {currentStatus === 'running' && !isKilled ? (
                          <div
                            style={{
                              width: '100%',
                              background: '#e2e8f0',
                              borderRadius: '4px',
                              height: '6px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: '68%',
                                background: '#2563eb',
                                height: '100%',
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {run.totalRawPoints.toLocaleString()} pts
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {currentStatus === 'running' && !isKilled ? (
                        <button
                          type="button"
                          onClick={(e) => handleKillRun(e, run.id)}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          🛑 Stop
                        </button>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          View details →
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {errorMessage && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="error-modal-title"
          onClick={() => !isRetrying && setErrorMessage(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 id="error-modal-title" className="modal-title">
              <span>⚠️</span> Telemetry Connection Error
            </h3>
            <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>{errorMessage}</p>
            <div className="modal-actions">
              <button className="action-btn" disabled={isRetrying} onClick={() => setErrorMessage(null)}>
                Dismiss
              </button>
              <button className="btn-primary" disabled={isRetrying} onClick={handleRetrySync}>
                {isRetrying ? 'Syncing cluster...' : 'Retry Sync'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};