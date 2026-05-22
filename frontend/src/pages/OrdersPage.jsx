import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AppHeader from '../components/AppHeader';
import CartSidebar from '../components/CartSidebar';
import OrderStepper from '../components/OrderStepper';
import Spinner from '../components/Spinner';
import { formatMaskedCardLast4, getOrderCardLast4 } from '../lib/paymentDisplay';

const STATUSES = [
  { value: 'processing', label: 'Processing' },
  { value: 'in-transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
];
const STATUS_ALIASES = {
  Processing: 'processing',
  'In Transit': 'in-transit',
  Delivered: 'delivered',
};

function normalizeOrderStatus(status) {
  return STATUS_ALIASES[status] || status;
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});
  const [feedback, setFeedback] = useState({});
  const [selectedStatuses, setSelectedStatuses] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    Promise.all([api.get('/api/orders/me'), api.get('/api/profile')])
      .then(([ordersData, userData]) => {
        setOrders(ordersData);
        setCurrentUser(userData);
        setSelectedStatuses(
          Object.fromEntries(ordersData.map((order) => [order.id, normalizeOrderStatus(order.status)]))
        );
        localStorage.setItem('user', JSON.stringify(userData));
      })
      .catch((err) => {
        if (err.message === 'No token provided' || err.message === 'Invalid token') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError('Failed to load your orders. Please try again.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    if (currentUser?.role !== 'product_manager') {
      setFeedback((f) => ({ ...f, [orderId]: { type: 'err', text: 'You are not authorized to update the order status.' } }));
      return;
    }

    setUpdating((u) => ({ ...u, [orderId]: true }));
    setFeedback((f) => ({ ...f, [orderId]: null }));
    try {
      const updated = await api.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)));
      setSelectedStatuses((prev) => ({ ...prev, [orderId]: updated.status }));
      setFeedback((f) => ({ ...f, [orderId]: { type: 'ok', text: 'Status updated.' } }));
    } catch (err) {
      setFeedback((f) => ({ ...f, [orderId]: { type: 'err', text: err.message } }));
    } finally {
      setUpdating((u) => ({ ...u, [orderId]: false }));
    }
  };

  const canUpdateStatus = currentUser?.role === 'product_manager';

  const cancelOrder = async (orderId) => {
    if (!confirm('Cancel this order? Stock will be released.')) return;
    setUpdating((u) => ({ ...u, [orderId]: true }));
    try {
      const updated = await api.patch(`/api/orders/${orderId}/cancel`, {});
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated, id: o.id } : o)));
      setFeedback((f) => ({ ...f, [orderId]: { type: 'ok', text: 'Order cancelled.' } }));
    } catch (err) {
      setFeedback((f) => ({ ...f, [orderId]: { type: 'err', text: err.message } }));
    } finally {
      setUpdating((u) => ({ ...u, [orderId]: false }));
    }
  };

  const requestReturn = async (order, item) => {
    const qtyRaw = prompt(`Return how many "${item.name}" (max ${item.quantity})?`, '1');
    if (qtyRaw == null) return;
    const qty = Number(qtyRaw);
    if (!Number.isInteger(qty) || qty < 1) {
      setFeedback((f) => ({ ...f, [order.id]: { type: 'err', text: 'Invalid quantity.' } }));
      return;
    }
    const reason = prompt('Reason (optional):', '') || '';
    setUpdating((u) => ({ ...u, [order.id]: true }));
    try {
      await api.post('/api/returns', {
        orderId: order.id,
        orderItemId: item._id || item.id,
        quantity: qty,
        reason,
      });
      setFeedback((f) => ({ ...f, [order.id]: { type: 'ok', text: 'Return request submitted.' } }));
    } catch (err) {
      setFeedback((f) => ({ ...f, [order.id]: { type: 'err', text: err.message } }));
    } finally {
      setUpdating((u) => ({ ...u, [order.id]: false }));
    }
  };

  return (
    <div className="page">
      <AppHeader />
      <main className="page-body">
        <div className="container-md" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="page-hero">
            <h1>My Orders</h1>
            <p>Track your past orders and their statuses here.</p>
          </div>
        </div>

        {loading && <Spinner label="Loading orders..." />}

        {error && !loading && (
          <div className="container-md">
            <div className="error-message" role="alert">{error}</div>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="container-md">
            <div className="empty-state">
              <h2>No orders yet</h2>
              <p>Start shopping to place your first order.</p>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
                Start Shopping
              </button>
            </div>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="orders-list">
            {orders.map((order) => {
              const maskedCard = formatMaskedCardLast4(getOrderCardLast4(order));
              return (
              <article key={order.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <span className="order-id">Order #{order.id.slice(-8).toUpperCase()}</span>
                    <span className="order-date">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </span>
                    {maskedCard && (
                      <span className="order-payment-mask">Paid with {maskedCard}</span>
                    )}
                  </div>
                  <span className="order-total">{order.totalPrice.toFixed(2)} ₺</span>
                </div>

                <div className="order-card-body">
                  <div className="order-items">
                    {order.items.map((item, i) => {
                      const productId = item.productId?._id || item.productId;
                      const goToProduct = () => {
                        if (productId) navigate(`/product/${productId}`);
                      };
                      return (
                        <div
                          key={i}
                          className="order-item-row order-item-row--clickable"
                          role={productId ? 'link' : undefined}
                          tabIndex={productId ? 0 : undefined}
                          onClick={goToProduct}
                          onKeyDown={(e) => {
                            if (productId && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              goToProduct();
                            }
                          }}
                          style={productId ? { cursor: 'pointer' } : undefined}
                          title={productId ? 'Go to product page' : undefined}
                        >
                          <span className="cart-item-code">{item.code}</span>
                          <span className="order-item-name">{item.name}</span>
                          <span className="order-item-qty">×{item.quantity}</span>
                          <span className="order-item-price">
                            {(item.price * item.quantity).toFixed(2)} ₺
                          </span>
                          {order.status === 'delivered' && !canUpdateStatus && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '0.75rem', marginLeft: 8 }}
                              onClick={(e) => { e.stopPropagation(); requestReturn(order, item); }}
                            >
                              Request return
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <OrderStepper status={order.status} />
                  </div>
                </div>

                {!canUpdateStatus && order.status === 'processing' && (
                  <div className="order-update-row">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={updating[order.id]}
                      onClick={() => cancelOrder(order.id)}
                    >
                      {updating[order.id] ? '...' : 'Cancel order'}
                    </button>
                    {feedback[order.id] && (
                      <span
                        className={`order-feedback ${
                          feedback[order.id].type === 'ok' ? 'order-feedback--ok' : 'order-feedback--err'
                        }`}
                      >
                        {feedback[order.id].text}
                      </span>
                    )}
                  </div>
                )}

                {!canUpdateStatus && order.status === 'cancelled' && (
                  <div className="order-update-row">
                    <span className="order-feedback order-feedback--err">Cancelled · refund pending</span>
                  </div>
                )}

                {!canUpdateStatus && order.status === 'delivered' && feedback[order.id] && (
                  <div className="order-update-row">
                    <span
                      className={`order-feedback ${
                        feedback[order.id].type === 'ok' ? 'order-feedback--ok' : 'order-feedback--err'
                      }`}
                    >
                      {feedback[order.id].text}
                    </span>
                  </div>
                )}

                {canUpdateStatus && (
                  <div className="order-update-row">
                    <select
                      className="form-select"
                      value={selectedStatuses[order.id] || normalizeOrderStatus(order.status)}
                      onChange={(e) =>
                        setSelectedStatuses((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={updating[order.id]}
                      onClick={() =>
                        handleStatusUpdate(order.id, selectedStatuses[order.id] || order.status)
                      }
                    >
                      {updating[order.id] ? 'Saving...' : 'Update Status'}
                    </button>
                    {feedback[order.id] && (
                      <span
                        className={`order-feedback ${
                          feedback[order.id].type === 'ok' ? 'order-feedback--ok' : 'order-feedback--err'
                        }`}
                      >
                        {feedback[order.id].text}
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
            })}
          </div>
        )}
      </main>
      <CartSidebar />
    </div>
  );
}
