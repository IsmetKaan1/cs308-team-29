import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';

export default function OrderConfirmationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const order = state?.order;

  useEffect(() => {
    if (!order) navigate('/');
  }, [order, navigate]);

  if (!order) return null;

  return (
    <div className="page">
      <AppHeader showNav={false} />
      <main className="page-body">
        <div className="container-sm">
          <div className="settings-card" style={{ margin: '0 auto' }}>
            <div className="confirmation-hero">
              <div className="confirmation-hero-icon" aria-hidden="true">✓</div>
              <h2>Siparişin alındı!</h2>
              <p>Teşekkürler, kısa süre içinde işleme alınacak.</p>
            </div>

            <div className="order-meta-row">
              <span>Sipariş No</span>
              <strong>{order.id}</strong>
            </div>

            <h2>Sipariş Detayları</h2>
            <div className="checkout-items" style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              {order.items.map((item) => (
                <div key={item._id || item.productId} className="checkout-item">
                  <div className="checkout-item-info">
                    <span className="cart-item-code">{item.code}</span>
                    <span className="checkout-item-name">{item.name}</span>
                  </div>
                  <div className="checkout-item-right">
                    <span className="checkout-item-qty">x{item.quantity}</span>
                    <span className="checkout-item-price">
                      {(item.price * item.quantity).toFixed(2)} ₺
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-divider" />

            <div className="checkout-total" style={{ marginBottom: 'var(--space-7)' }}>
              <span>Toplam</span>
              <span>{order.totalPrice.toFixed(2)} ₺</span>
            </div>

            <h2>Teslimat Adresi</h2>
            <div className="confirmation-address">
              <div><strong>{order.shippingAddress.fullName}</strong></div>
              <div>{order.shippingAddress.address}</div>
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.postalCode}
              </div>
              <div>{order.shippingAddress.country}</div>
            </div>

            <div className="detail-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
                Alışverişe Devam Et
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => navigate('/orders')}>
                Siparişlerim
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
