import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/cartStore';
import { api } from '../api';
import AppHeader from '../components/AppHeader';

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
          <p className="subtitle">Ödeme sayfasına devam etmek için lütfen giriş yap.</p>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => navigate('/login')}>
            Giriş Yap
          </button>
          <p className="link-text">
            Hesabın yok mu?{' '}
            <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>
              Kayıt Ol
            </a>
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const shippingAddress = {
      fullName: fullName.trim(),
      address: address.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
    };

    if (state.items.length === 0) {
      setError('Sepetiniz boş.');
      return;
    }
    if (Object.values(shippingAddress).some((value) => !value)) {
      setError('Lütfen teslimat adresindeki tüm alanları doldur.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await api.post('/api/orders', { items: state.items, shippingAddress });
      dispatch({ type: 'CLEAR_CART' });
      navigate('/order-confirmation', { state: { order } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <AppHeader showNav={false} />
      <main className="page-body">
        <div className="container-md" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="page-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <h1>Ödeme</h1>
              <p>Teslimat bilgilerini gir ve siparişini tamamla.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>← Alışverişe Dön</button>
          </div>
        </div>

        <div className="checkout-layout">
          <div className="checkout-form-card">
            <h2 className="card-title">Teslimat Adresi</h2>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="co-name">Ad Soyad</label>
                <input
                  id="co-name"
                  type="text"
                  className="form-input"
                  placeholder="Ad Soyad"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="co-addr">Adres</label>
                <input
                  id="co-addr"
                  type="text"
                  className="form-input"
                  placeholder="Sokak, apartman no"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  autoComplete="street-address"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="co-city">Şehir</label>
                  <input
                    id="co-city"
                    type="text"
                    className="form-input"
                    placeholder="İstanbul"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    autoComplete="address-level2"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="co-postal">Posta Kodu</label>
                  <input
                    id="co-postal"
                    type="text"
                    className="form-input"
                    placeholder="34000"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    required
                    autoComplete="postal-code"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="co-country">Ülke</label>
                <input
                  id="co-country"
                  type="text"
                  className="form-input"
                  placeholder="Türkiye"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  autoComplete="country-name"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={submitting || state.items.length === 0}
              >
                {submitting ? 'İşleniyor...' : 'Siparişi Tamamla'}
              </button>
            </form>
          </div>

          <aside className="checkout-summary-card" aria-label="Sipariş özeti">
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
          </aside>
        </div>
      </main>
    </div>
  );
}
