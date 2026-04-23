import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function OrderConfirmationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const order = state?.order;

  useEffect(() => {
    if (!order) navigate('/');
  }, [order, navigate]);

  if (!order) return null;

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Sipariş Onayı</h1>
      </div>

      <div className="settings-card" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="success-message" style={{ fontSize: 15, marginBottom: 20 }}>
          Siparişiniz başarıyla alındı!
        </div>

        <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
          Sipariş No: <strong style={{ color: '#444' }}>{order.id}</strong>
        </p>

        <h2>Sipariş Detayları</h2>

        <div className="checkout-items" style={{ marginTop: 16, marginBottom: 16 }}>
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

        <div className="checkout-total" style={{ marginBottom: 28 }}>
          <span>Toplam</span>
          <span>{order.totalPrice.toFixed(2)} ₺</span>
        </div>

        <h2 style={{ marginBottom: 12 }}>Teslimat Adresi</h2>

        <div className="confirmation-address">
          <div>{order.shippingAddress.fullName}</div>
          <div>{order.shippingAddress.address}</div>
          <div>
            {order.shippingAddress.city}, {order.shippingAddress.postalCode}
          </div>
          <div>{order.shippingAddress.country}</div>
        </div>

        <button className="btn-primary" onClick={() => navigate('/')}>
          Alışverişe Devam Et
        </button>
      </div>
    </div>
  );
}
