import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AppHeader from '../components/AppHeader';
import OrderStepper from '../components/OrderStepper';
import Spinner from '../components/Spinner';

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
            {orders.map((order) => (
              <article key={order.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <span className="order-id">Order #{order.id.slice(-8).toUpperCase()}</span>
                    <span className="order-date">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </span>
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
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <OrderStepper status={order.status} />
                  </div>
                </div>

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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
