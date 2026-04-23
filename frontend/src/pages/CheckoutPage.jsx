import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../api';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useCart();

  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isGuest = !localStorage.getItem('token');

  if (isGuest) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h2>Giriş Gerekli</h2>
          <p className="subtitle">Ödeme sayfasına devam etmek için lütfen giriş yapın.</p>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Giriş Yap
          </button>
          <div className="link-text" style={{ marginTop: 16 }}>
            Hesabınız yok mu?{' '}
            <a
              href="/register"
              onClick={(e) => { e.preventDefault(); navigate('/register'); }}
            >
              Kayıt Ol
            </a>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const order = await api.post('/api/orders', {
        items: state.items,
        shippingAddress: { fullName, address, city, postalCode, country },
      });
      dispatch({ type: 'CLEAR_CART' });
      navigate('/order-confirmation', { state: { order } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Ödeme</h1>
        <button className="btn-logout" onClick={() => navigate('/')}>
          ← Alışverişe Dön
        </button>
      </div>

      <div className="checkout-layout">
        <div className="settings-card checkout-form-card">
          <h2>Teslimat Adresi</h2>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Ad Soyad</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ad Soyad"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Adres</label>
              <input
                type="text"
                className="form-input"
                placeholder="Sokak, apartman no"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Şehir</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="İstanbul"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Posta Kodu</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="34000"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Ülke</label>
              <input
                type="text"
                className="form-input"
                placeholder="Türkiye"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || state.items.length === 0}
            >
              {submitting ? 'İşleniyor...' : 'Siparişi Tamamla'}
            </button>
          </form>
        </div>

        <div className="checkout-summary-card">
          <h2>Sipariş Özeti</h2>

          {state.items.length === 0 ? (
            <p className="cart-empty">Sepetiniz boş.</p>
          ) : (
            <>
              <div className="checkout-items">
                {state.items.map((item) => (
                  <div key={item.id} className="checkout-item">
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

              <div className="checkout-total">
                <span>Toplam</span>
                <span>{state.totalPrice.toFixed(2)} ₺</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
