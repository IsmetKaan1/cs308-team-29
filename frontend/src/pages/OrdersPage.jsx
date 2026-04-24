import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import OrderStepper from '../components/OrderStepper';
import ProfileIcon from '../components/ProfileIcon';
import CartIcon from '../components/CartIcon';

const STATUSES = ['Processing', 'In Transit', 'Delivered'];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [updating, setUpdating] = useState({});
  const [feedback, setFeedback] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    api.get('/api/orders/me')
      .then(setOrders)
      .catch((err) => {
        if (err.message === 'No token provided' || err.message === 'Invalid token') {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Could not load orders.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating((u) => ({ ...u, [orderId]: true }));
    setFeedback((f) => ({ ...f, [orderId]: null }));
    try {
      const updated = await api.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)));
      setFeedback((f) => ({ ...f, [orderId]: { type: 'ok', text: 'Status updated.' } }));
    } catch (err) {
      setFeedback((f) => ({ ...f, [orderId]: { type: 'err', text: err.message } }));
    } finally {
      setUpdating((u) => ({ ...u, [orderId]: false }));
    }
  };

  if (loading) return <div style={styles.center}>Loading orders…</div>;

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button onClick={() => navigate('/')} style={styles.back}>← Shop</button>
        <h1 style={styles.title}>My Orders</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <CartIcon />
          <ProfileIcon />
        </div>
      </div>

      {error && <p style={styles.globalError}>{error}</p>}

      {orders.length === 0 && !error && (
        <div style={styles.empty}>
          <p>You have no orders yet.</p>
          <button onClick={() => navigate('/')} style={styles.shopBtn}>Start Shopping</button>
        </div>
      )}

      <div style={styles.list}>
        {orders.map((order) => (
          <div key={order.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <span style={styles.orderId}>Order #{order.id.slice(-8).toUpperCase()}</span>
                <span style={styles.date}>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <span style={styles.total}>₺{order.totalPrice.toFixed(2)}</span>
            </div>

            <div style={styles.cardBody}>
              <div style={styles.items}>
                {order.items.map((item, i) => (
                  <div key={i} style={styles.item}>
                    <span style={styles.itemCode}>{item.code}</span>
                    <span style={styles.itemName}>{item.name}</span>
                    <span style={styles.itemQty}>×{item.quantity}</span>
                    <span style={styles.itemPrice}>₺{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={styles.stepperCol}>
                <OrderStepper status={order.status} />
              </div>
            </div>

            <div style={styles.updateRow}>
              <select
                defaultValue={order.status}
                onChange={(e) => {
                  const el = e.currentTarget;
                  el.dataset.selected = e.target.value;
                }}
                id={`select-${order.id}`}
                style={styles.select}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                style={styles.updateBtn}
                disabled={updating[order.id]}
                onClick={() => {
                  const sel = document.getElementById(`select-${order.id}`);
                  handleStatusUpdate(order.id, sel.value);
                }}
              >
                {updating[order.id] ? 'Saving…' : 'Update Status'}
              </button>
              {feedback[order.id] && (
                <span style={feedback[order.id].type === 'ok' ? styles.feedbackOk : styles.feedbackErr}>
                  {feedback[order.id].text}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container:   { maxWidth: 800, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' },
  topBar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  back:        { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#4f46e5', padding: 0 },
  title:       { margin: 0, fontSize: 22, fontWeight: 700 },
  center:      { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: 16 },
  globalError: { color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  empty:       { textAlign: 'center', padding: '60px 0', color: '#6b7280' },
  shopBtn:     { marginTop: 12, padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  list:        { display: 'flex', flexDirection: 'column', gap: 20 },
  card:        { border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  cardHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  orderId:     { fontWeight: 700, fontSize: 14, display: 'block' },
  date:        { fontSize: 12, color: '#9ca3af', display: 'block', marginTop: 2 },
  total:       { fontWeight: 700, fontSize: 16, color: '#111' },
  cardBody:    { display: 'flex', gap: 24, justifyContent: 'space-between', flexWrap: 'wrap' },
  items:       { flex: 1, display: 'flex', flexDirection: 'column', gap: 8 },
  item:        { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  itemCode:    { background: '#ede9fe', color: '#6d28d9', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, flexShrink: 0 },
  itemName:    { flex: 1, color: '#374151' },
  itemQty:     { color: '#6b7280', flexShrink: 0 },
  itemPrice:   { fontWeight: 600, flexShrink: 0 },
  stepperCol:  { display: 'flex', alignItems: 'flex-start', paddingTop: 2 },
  updateRow:   { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f3f4f6', flexWrap: 'wrap' },
  select:      { padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, cursor: 'pointer' },
  updateBtn:   { padding: '6px 14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  feedbackOk:  { fontSize: 12, color: '#16a34a' },
  feedbackErr: { fontSize: 12, color: '#dc2626' },
};
