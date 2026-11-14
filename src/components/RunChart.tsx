import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { CleanMetricPoint } from '../utils/dataProcessor';

interface RunChartProps { 
  title: string;
  data: CleanMetricPoint[];
  metricKey: 'loss' | 'lr' | 'grad_norm';
  color: string;
}

export const RunChart: React.FC<RunChartProps> = ({ title, data, metricKey, color }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const xSteps: number[] = data.map((d) => d.step);
    const yValues: (number | null)[] = data.map((d) => d[metricKey]);
    const chartData: uPlot.AlignedData = [xSteps, yValues] as any;

    const opts: any = {
      width: containerRef.current.clientWidth || 600,
      height: 220,
      scales: {
        x: {
          time: false,
        },
      },
      series: [
        {
          label: 'Step',
        },
        {
          label: title,
          stroke: color,
          width: 2,
          points: { show: data.length < 50 },
          value: (_u: any, v: number | null) =>
            v == null ? 'NaN / Gap' : metricKey === 'lr' ? v.toExponential(2) : v.toFixed(4),
        },
      ],
      axes: [
        {
          stroke: '#64748b',
          grid: { stroke: '#f1f5f9' },
          values: (_u: any, vals: number[]) => vals.map((v) => v.toLocaleString()),
        },
        {
          stroke: '#64748b',
          grid: { stroke: '#f1f5f9' },
          size: 65,
          values: (_u: any, vals: number[]) =>
            vals.map((v) => (metricKey === 'lr' && v !== 0 ? v.toExponential(1) : v.toString())),
        },
      ],
      cursor: {
        drag: { setScale: true },
      },
    };

    const plot = new uPlot(opts, chartData, containerRef.current);
    chartRef.current = plot;

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.setSize({
          width: containerRef.current.clientWidth || 600,
          height: 220,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      plot.destroy();
    };
  }, [data, title, metricKey, color]);

  return (
    <div className="chart-card">
      <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <div ref={containerRef} style={{ width: '100%' }} />
    </div>
  );
};