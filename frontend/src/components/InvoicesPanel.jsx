import { useState } from 'react';
import { api } from '../api';
import Spinner from './Spinner';

function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function InvoicesPanel() {
  const init = defaultDates();
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
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
      const result = await api.get(`/api/sales/invoices?${qs.toString()}`);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (id) => {
    try {
      const blob = await api.getBlob(`/api/sales/invoices/${id}/pdf`, { accept: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Could not download invoice.');
    }
  };

  const printPdf = async (id) => {
    try {
      const blob = await api.getBlob(`/api/sales/invoices/${id}/pdf`, { accept: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (w) w.addEventListener('load', () => w.print());
    } catch (err) {
      setError(err.message || 'Could not open invoice.');
    }
  };

  return (
    <div className="container-md">
      <div style={{ background: '#f4f6f8', borderRadius: 8, padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ marginTop: 0 }}>Filter by date</h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <button type="button" className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Apply'}
          </button>
        </div>
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}
      {loading && <Spinner label="Loading invoices..." />}

      {data && !loading && (
        <>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <strong>{data.count}</strong> invoice(s) · Total revenue:{' '}
            <strong>{Number(data.totalAmount).toFixed(2)} ₺</strong>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Date</th>
                <th style={{ padding: 8 }}>Order ID</th>
                <th style={{ padding: 8 }}>Buyer</th>
                <th style={{ padding: 8 }}>Items</th>
                <th style={{ padding: 8 }}>Total (₺)</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 8 }}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: '0.8rem' }}>{inv.id.slice(-8)}</td>
                  <td style={{ padding: 8 }}>
                    {inv.buyer?.fullName || inv.buyer?.username || '—'}
                    <div style={{ color: '#666', fontSize: '0.8rem' }}>{inv.buyer?.email}</div>
                  </td>
                  <td style={{ padding: 8 }}>{inv.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td style={{ padding: 8 }}>{Number(inv.totalPrice).toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{inv.status}</td>
                  <td style={{ padding: 8, display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={() => downloadPdf(inv.id)}
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={() => printPdf(inv.id)}
                    >
                      Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.invoices.length === 0 && (
            <div className="empty-state" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
              <p>No invoices in this range.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
