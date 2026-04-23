import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state } = useCart();

  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

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

          <form>
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

            <button type="submit" className="btn-primary" disabled>
              Siparişi Tamamla
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
