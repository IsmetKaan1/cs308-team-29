import { useEffect, useState } from 'react';
import { api } from '../api';
import Spinner from './Spinner';

const STATUS_ORDER = ['processing', 'in-transit', 'delivered'];
const STATUS_LABEL = {
  processing: 'Processing',
  'in-transit': 'In Transit',
  delivered: 'Delivered',
};
const NEXT_LABEL = {
  processing: 'Ship Out',
  'in-transit': 'Mark as Delivered',
};

function nextStatus(current) {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx < 0 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function ShipmentsPanel() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState({});
  const [feedback, setFeedback] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const list = await api.get(`/api/orders${query}`);
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load orders.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const advance = async (order) => {
    const next = nextStatus(order.status);
    if (!next) return;
    const id = order.id || order._id;
    setBusyIds((s) => ({ ...s, [id]: true }));
    setFeedback((s) => ({ ...s, [id]: null }));
    try {
      const updated = await api.patch(`/api/orders/${id}/status`, { status: next });
      const updatedId = updated.id || updated._id;
      setOrders((list) =>
        list.map((o) => ((o.id || o._id) === updatedId ? updated : o))
      );
      setFeedback((s) => ({
        ...s,
        [id]: { type: 'ok', text: `Status: ${STATUS_LABEL[next] || next}` },
      }));
    } catch (err) {
      setFeedback((s) => ({
        ...s,
        [id]: { type: 'err', text: err.message || 'Could not update.' },
      }));
    } finally {
      setBusyIds((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <div className="container-md">
      <div className="page-hero">
        <h1>Shipping Management</h1>
        <p>Advance the shipping status of orders step by step.</p>
      </div>

      <div className="filters-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label htmlFor="shipment-status-filter" style={{ fontSize: 'var(--fs-13)' }}>
          Status:
        </label>
        <select
          id="shipment-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-input"
          style={{ width: 'auto' }}
        >
          <option value="">All</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button type="button" className="btn btn-ghost-light btn-sm" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && <Spinner label="Loading orders..." />}
      {error && !loading && <div className="error-message" role="alert">{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-state">
          <p>No orders match these criteria.</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <table className="table" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const id = o.id || o._id;
              const next = nextStatus(o.status);
              const itemSummary = (o.items || [])
                .map((it) => `${it.name} ×${it.quantity}`)
                .join(', ');
              return (
                <tr key={id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>#{String(id).slice(-6).toUpperCase()}</div>
                    <div style={{ fontSize: 'var(--fs-12)', color: 'var(--color-ink-500)' }}>
                      {formatDate(o.createdAt)}
                    </div>
                    <div style={{ fontSize: 'var(--fs-12)', color: 'var(--color-ink-600)', marginTop: 4 }}>
                      {itemSummary}
                    </div>
                  </td>
                  <td>{o.shippingAddress?.fullName || '—'}</td>
                  <td style={{ fontSize: 'var(--fs-12)' }}>
                    {o.shippingAddress
                      ? `${o.shippingAddress.address}, ${o.shippingAddress.city} ${o.shippingAddress.postalCode}, ${o.shippingAddress.country}`
                      : '—'}
                  </td>
                  <td>{Number(o.totalPrice || 0).toFixed(2)} ₺</td>
                  <td>
                    <span className={`status-pill status-pill--${o.status}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </td>
                  <td>
                    {next ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!!busyIds[id]}
                        onClick={() => advance(o)}
                      >
                        {busyIds[id] ? '...' : (NEXT_LABEL[o.status] || `→ ${STATUS_LABEL[next]}`)}
                      </button>
                    ) : (
                      <span style={{ fontSize: 'var(--fs-12)', color: 'var(--color-ink-500)' }}>
                        Completed
                      </span>
                    )}
                    {feedback[id] && (
                      <div
                        className={feedback[id].type === 'ok' ? 'order-feedback order-feedback--ok' : 'order-feedback order-feedback--err'}
                        style={{ marginTop: 6, fontSize: 'var(--fs-12)' }}
                      >
                        {feedback[id].text}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
