import { useEffect, useState } from 'react';
import { api } from '../api';
import Spinner from './Spinner';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

export default function ReturnsPanel() {
  const [status, setStatus] = useState('pending');
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rowMsg, setRowMsg] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = status ? `?status=${status}` : '';
      const data = await api.get(`/api/returns${qs}`);
      setReturns(data);
    } catch (err) {
      setError(err.message || 'Failed to load returns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const decide = async (id, action) => {
    let note = '';
    if (action === 'reject') {
      note = prompt('Reason for rejection (optional):', '') || '';
    }
    setBusyId(id);
    setRowMsg((s) => ({ ...s, [id]: null }));
    try {
      await api.patch(`/api/returns/${id}`, { action, note });
      setRowMsg((s) => ({ ...s, [id]: { type: 'ok', text: action === 'approve' ? 'Approved & restocked.' : 'Rejected.' } }));
      load();
    } catch (err) {
      setRowMsg((s) => ({ ...s, [id]: { type: 'err', text: err.message } }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container-md">
      <div style={{
        background: '#f4f6f8', borderRadius: 8, padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <label>
          Status:{' '}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-secondary" onClick={load} style={{ padding: '4px 10px' }}>
          Refresh
        </button>
        <span style={{ marginLeft: 'auto', color: '#666' }}>{returns.length} request(s)</span>
      </div>

      {loading && <Spinner label="Loading returns..." />}
      {error && <div className="error-message" role="alert">{error}</div>}

      {!loading && returns.length === 0 && (
        <div className="empty-state" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          <p>No return requests.</p>
        </div>
      )}

      {!loading && returns.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Date</th>
              <th style={{ padding: 8 }}>Customer ID</th>
              <th style={{ padding: 8 }}>Product</th>
              <th style={{ padding: 8 }}>Qty</th>
              <th style={{ padding: 8 }}>Refund (₺)</th>
              <th style={{ padding: 8 }}>Reason</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {String(r.userId).slice(-8)}
                </td>
                <td style={{ padding: 8 }}>
                  <div style={{ fontWeight: 600 }}>{r.productCode}</div>
                  <div style={{ color: '#666' }}>{r.productName}</div>
                </td>
                <td style={{ padding: 8 }}>{r.quantity}</td>
                <td style={{ padding: 8 }}>{Number(r.totalRefund).toFixed(2)}</td>
                <td style={{ padding: 8, maxWidth: 240 }}>{r.reason || '—'}</td>
                <td style={{ padding: 8 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                    background: r.status === 'approved' ? '#dcfce7' : r.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                    color: r.status === 'approved' ? '#166534' : r.status === 'rejected' ? '#991b1b' : '#854d0e',
                    fontSize: '0.75rem',
                  }}>
                    {r.status}
                  </span>
                  {r.rejectionNote && <div style={{ color: '#666', fontSize: '0.75rem', marginTop: 4 }}>{r.rejectionNote}</div>}
                </td>
                <td style={{ padding: 8 }}>
                  {r.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, 'approve')}
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, 'reject')}
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                          Reject
                        </button>
                      </div>
                      {rowMsg[r.id] && (
                        <span style={{ color: rowMsg[r.id].type === 'ok' ? '#0c7' : '#c33', fontSize: '0.75rem' }}>
                          {rowMsg[r.id].text}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#666', fontSize: '0.8rem' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
