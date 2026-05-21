import { useState } from 'react';
import { api } from '../api';
import Spinner from './Spinner';

function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 3);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function LineChart({ series, height = 260 }) {
  if (!series.length) {
    return <div className="empty-state" style={{ padding: 'var(--space-5)' }}>No data in range.</div>;
  }
  const width = Math.max(560, series.length * 60);
  const pad = 40;
  const maxY = Math.max(
    1,
    ...series.flatMap((s) => [s.revenue, s.cost, Math.abs(s.profit)])
  );
  const minY = Math.min(0, ...series.map((s) => s.profit));
  const yRange = maxY - minY || 1;
  const x = (i) => pad + (i * (width - 2 * pad)) / Math.max(1, series.length - 1);
  const y = (v) => pad + ((maxY - v) / yRange) * (height - 2 * pad);

  const path = (key, color) => {
    const d = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(s[key])}`).join(' ');
    return <path d={d} fill="none" stroke={color} strokeWidth={2} />;
  };

  const zeroY = y(0);

  return (
    <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
      <svg width={width} height={height} role="img" aria-label="Revenue / profit chart">
        {/* axes */}
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#bbb" />
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#bbb" />
        {/* zero line if profits go negative */}
        {minY < 0 && (
          <line x1={pad} y1={zeroY} x2={width - pad} y2={zeroY} stroke="#999" strokeDasharray="4 4" />
        )}
        {path('revenue', '#2563eb')}
        {path('cost', '#9ca3af')}
        {path('profit', '#16a34a')}
        {/* data points */}
        {series.map((s, i) => (
          <g key={s.period}>
            <circle cx={x(i)} cy={y(s.revenue)} r={3} fill="#2563eb" />
            <circle cx={x(i)} cy={y(s.cost)} r={3} fill="#9ca3af" />
            <circle cx={x(i)} cy={y(s.profit)} r={3} fill={s.profit >= 0 ? '#16a34a' : '#dc2626'} />
            <text x={x(i)} y={height - pad + 16} textAnchor="middle" fontSize={11} fill="#555">
              {s.period}
            </text>
          </g>
        ))}
        {/* y axis labels */}
        <text x={4} y={pad + 4} fontSize={11} fill="#555">{maxY.toFixed(0)}</text>
        <text x={4} y={zeroY + 4} fontSize={11} fill="#555">0</text>
        {minY < 0 && (
          <text x={4} y={height - pad + 4} fontSize={11} fill="#555">{minY.toFixed(0)}</text>
        )}
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: '#555', marginTop: 8 }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#2563eb', marginRight: 4 }} />Revenue</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#9ca3af', marginRight: 4 }} />Cost</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#16a34a', marginRight: 4 }} />Profit</span>
      </div>
    </div>
  );
}

export default function RevenuePanel() {
  const init = defaultDates();
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [granularity, setGranularity] = useState('day');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      qs.set('granularity', granularity);
      const result = await api.get(`/api/sales/analytics/revenue?${qs.toString()}`);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-md">
      <div style={{ background: '#f4f6f8', borderRadius: 8, padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ marginTop: 0 }}>Revenue & profit</h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label>
            Granularity{' '}
            <select value={granularity} onChange={(e) => setGranularity(e.target.value)}>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Calculate'}
          </button>
        </div>
        <p style={{ color: '#666', marginTop: 'var(--space-2)', fontSize: '0.85rem' }}>
          Profit = (sale price − product cost) × quantity. Set the cost of each product in the Pricing tab.
        </p>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}
      {loading && <Spinner label="Loading analytics..." />}

      {data && !loading && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12, marginBottom: 'var(--space-4)',
          }}>
            <Stat label="Revenue" value={`${data.totals.revenue.toFixed(2)} ₺`} color="#2563eb" />
            <Stat label="Cost" value={`${data.totals.cost.toFixed(2)} ₺`} color="#9ca3af" />
            <Stat
              label={data.totals.profit >= 0 ? 'Profit' : 'Loss'}
              value={`${data.totals.profit.toFixed(2)} ₺`}
              color={data.totals.profit >= 0 ? '#16a34a' : '#dc2626'}
            />
            <Stat label="Orders" value={data.totals.orders} />
            <Stat label="Units sold" value={data.totals.units} />
          </div>
          <LineChart series={data.series} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12,
    }}>
      <div style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: color || '#222', marginTop: 4 }}>{value}</div>
    </div>
  );
}
