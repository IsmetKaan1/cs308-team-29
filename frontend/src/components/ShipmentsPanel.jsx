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
  'in-transit': 'Mark Delivered',
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
        [id]: { type: 'ok', text: STATUS_LABEL[next] || next },
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

  const smallBtn = {
    padding: '6px 12px',
    fontSize: 'var(--fs-13)',
    borderRadius: 'var(--radius-md)',
  };

  return (
    <div className="container-md">
      <div className="page-hero">
        <h1>Shipping Management</h1>
        <p>Advance the shipping status of orders step by step.</p>
      </div>

      <form
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
        }}
        onSubmit={(e) => e.preventDefault()}
      >
        <select
          id="shipment-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-input"
          style={{ width: 'auto' }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </form>

      {loading && <Spinner label="Loading orders..." />}
      {error && !loading && <div className="error-message" role="alert">{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-state">
          <p>No orders match these criteria.</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: 'var(--fs-14)' }}>
            <thead>
              <tr style={{ color: 'var(--color-ink-500)', fontWeight: 'var(--fw-medium)' }}>
                <th style={{ padding: '10px 12px' }}>Order</th>
                <th style={{ padding: '10px 12px' }}>Customer</th>
                <th style={{ padding: '10px 12px' }}>Address</th>
                <th style={{ padding: '10px 12px' }}>Total</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }} aria-label="Action"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const id = o.id || o._id;
                const next = nextStatus(o.status);
                const itemSummary = (o.items || [])
                  .map((it) => `${it.name} ×${it.quantity}`)
                  .join(', ');
                const fb = feedback[id];
                return (
                  <tr key={id} style={{ borderTop: '1px solid var(--color-ink-100)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600 }}>#{String(id).slice(-6).toUpperCase()}</div>
                      <div style={{ fontSize: 'var(--fs-12)', color: 'var(--color-ink-500)' }}>
                        {formatDate(o.createdAt)}
                      </div>
                      {itemSummary && (
                        <div style={{ fontSize: 'var(--fs-12)', color: 'var(--color-ink-600)', marginTop: 2 }}>
                          {itemSummary}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600 }}>
                        {o.buyer?.username || o.shippingAddress?.fullName || '—'}
                      </div>
                      {o.buyer?.email && (
                        <div style={{ fontSize: 'var(--fs-12)', color: 'var(--color-ink-500)' }}>
                          {o.buyer.email}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 'var(--fs-12)', color: 'var(--color-ink-600)' }}>
                      {o.shippingAddress
                        ? `${o.shippingAddress.address}, ${o.shippingAddress.city} ${o.shippingAddress.postalCode}, ${o.shippingAddress.country}`
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{Number(o.totalPrice || 0).toFixed(2)} ₺</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`status-pill status-pill--${o.status}`}>
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {next ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={smallBtn}
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
                      {fb && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 'var(--fs-12)',
                            color: fb.type === 'ok' ? 'var(--color-success-700, #15803d)' : 'var(--color-danger-700, #b91c1c)',
                          }}
                        >
                          {fb.text}
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
    </div>
  );
}
