import { useEffect, useState } from 'react';
import { api } from '../api';
import Spinner from './Spinner';

function fmtAddress(a) {
  if (!a) return '';
  return `${a.fullName}, ${a.address}, ${a.city} ${a.postalCode}, ${a.country}`;
}

export default function DeliveriesPanel() {
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = filter === 'all' ? '' : `?completed=${filter === 'completed'}`;
      const result = await api.get(`/api/deliveries${qs}`);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load deliveries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const markComplete = async (d, completed) => {
    setBusyId(d.deliveryId);
    try {
      await api.patch(`/api/deliveries/${d.deliveryId}/complete`, { completed });
      await load();
    } catch (err) {
      setError(err.message || 'Could not update.');
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
          Filter:{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <button type="button" className="btn btn-secondary" onClick={load} style={{ padding: '4px 10px' }}>
          Refresh
        </button>
        {data && <span style={{ marginLeft: 'auto', color: '#666' }}>{data.count} line(s)</span>}
      </div>

      {loading && <Spinner label="Loading deliveries..." />}
      {error && <div className="error-message" role="alert">{error}</div>}

      {data && !loading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Delivery ID</th>
              <th style={{ padding: 8 }}>Customer ID</th>
              <th style={{ padding: 8 }}>Product ID</th>
              <th style={{ padding: 8 }}>Product</th>
              <th style={{ padding: 8 }}>Qty</th>
              <th style={{ padding: 8 }}>Total (₺)</th>
              <th style={{ padding: 8 }}>Address</th>
              <th style={{ padding: 8 }}>Completed</th>
              <th style={{ padding: 8 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.deliveries.map((d) => (
              <tr key={d.deliveryId} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {d.deliveryId.slice(-12)}
                </td>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {String(d.customerId).slice(-8)}
                  {d.customer && (
                    <div style={{ color: '#666', fontFamily: 'inherit', fontSize: '0.85em' }}>
                      {d.customer.fullName}
                    </div>
                  )}
                </td>
                <td style={{ padding: 8, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {String(d.productId).slice(-8)}
                </td>
                <td style={{ padding: 8 }}>
                  <div style={{ fontWeight: 600 }}>{d.productCode}</div>
                  <div style={{ color: '#666' }}>{d.productName}</div>
                </td>
                <td style={{ padding: 8 }}>{d.quantity}</td>
                <td style={{ padding: 8 }}>{Number(d.totalPrice).toFixed(2)}</td>
                <td style={{ padding: 8, maxWidth: 260 }}>{fmtAddress(d.deliveryAddress)}</td>
                <td style={{ padding: 8 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                    background: d.completed ? '#dcfce7' : '#fee2e2',
                    color: d.completed ? '#166534' : '#991b1b',
                    fontSize: '0.75rem',
                  }}>
                    {d.completed ? 'Completed' : 'Pending'}
                  </span>
                </td>
                <td style={{ padding: 8 }}>
                  <button
                    type="button"
                    className={d.completed ? 'btn btn-secondary' : 'btn btn-primary'}
                    disabled={busyId === d.deliveryId}
                    onClick={() => markComplete(d, !d.completed)}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  >
                    {d.completed ? 'Mark pending' : 'Mark complete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && !loading && data.deliveries.length === 0 && (
        <div className="empty-state" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          <p>No deliveries in this view.</p>
        </div>
      )}
    </div>
  );
}
