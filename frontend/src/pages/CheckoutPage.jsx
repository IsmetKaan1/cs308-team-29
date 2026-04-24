import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/cartStore';
import { api } from '../api';
import AppHeader from '../components/AppHeader';

const STEP_SHIPPING = 'shipping';
const STEP_PAYMENT = 'payment';

function formatCardNumber(value) {
  const digits = value.replace(/\D+/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D+/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatCvv(value) {
  return value.replace(/\D+/g, '').slice(0, 3);
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useCart();

  const [step, setStep] = useState(STEP_SHIPPING);

  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [shippingError, setShippingError] = useState('');

  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [paymentError, setPaymentError] = useState('');
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

  function shippingAddressObject() {
    return {
      fullName: fullName.trim(),
      address: address.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
    };
  }

  function handleContinueToPayment(e) {
    e.preventDefault();
    setShippingError('');

    if (state.items.length === 0) {
      setShippingError('Sepetiniz boş.');
      return;
    }
    const addr = shippingAddressObject();
    if (Object.values(addr).some((v) => !v)) {
      setShippingError('Lütfen teslimat adresindeki tüm alanları doldur.');
      return;
    }
    setStep(STEP_PAYMENT);
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    setPaymentError('');

    const digits = cardNumber.replace(/\D+/g, '');
    if (!cardHolder.trim()) { setPaymentError('Kart üzerindeki ad gerekli.'); return; }
    if (digits.length !== 16) { setPaymentError('Kart numarası 16 haneli olmalı.'); return; }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) { setPaymentError('Son kullanma tarihi AA/YY formatında olmalı.'); return; }
    if (cvv.length !== 3) { setPaymentError('CVV 3 haneli olmalı.'); return; }

    setSubmitting(true);
    try {
      const payment = await api.post('/api/payments/mock', {
        cardHolderName: cardHolder.trim(),
        cardNumber: digits,
        expiry,
        cvv,
      });

      if (!payment.approved) {
        setPaymentError(payment.error || 'Ödeme reddedildi. Lütfen farklı bir kart dene.');
        return;
      }

      const order = await api.post('/api/orders', {
        items: state.items,
        shippingAddress: shippingAddressObject(),
        paymentTransactionId: payment.transactionId,
      });
      dispatch({ type: 'CLEAR_CART' });
      navigate('/order-confirmation', { state: { order } });
    } catch (err) {
      setPaymentError(err.message || 'Ödeme sırasında bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmitShipping = state.items.length > 0;

  return (
    <div className="page">
      <AppHeader showNav={false} />
      <main className="page-body">
        <div className="container-md" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="page-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <h1>Ödeme</h1>
              <p>Teslimat bilgilerini gir ve güvenli ödeme ile tamamla.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>← Alışverişe Dön</button>
          </div>
        </div>

        <div className="checkout-layout">
          <div className="checkout-form-card">
            <div className="checkout-steps" role="tablist" aria-label="Ödeme adımları">
              <div
                className={`checkout-step ${step === STEP_SHIPPING ? 'is-active' : 'is-done'}`}
                role="tab"
                aria-selected={step === STEP_SHIPPING}
              >
                <span className="checkout-step-num">{step === STEP_SHIPPING ? '1' : '✓'}</span>
                Teslimat
              </div>
              <div className={`checkout-step-sep ${step === STEP_PAYMENT ? 'is-done' : ''}`} />
              <div
                className={`checkout-step ${step === STEP_PAYMENT ? 'is-active' : ''}`}
                role="tab"
                aria-selected={step === STEP_PAYMENT}
              >
                <span className="checkout-step-num">2</span>
                Ödeme
              </div>
            </div>

            {step === STEP_SHIPPING && (
              <>
                <h2 className="card-title">Teslimat Adresi</h2>

                {shippingError && <div className="error-message">{shippingError}</div>}

                <form onSubmit={handleContinueToPayment} noValidate>
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
                    disabled={!canSubmitShipping}
                  >
                    Ödemeye Geç
                  </button>
                </form>
              </>
            )}

            {step === STEP_PAYMENT && (
              <>
                <h2 className="card-title">Kart Bilgileri</h2>

                <div className="mock-payment-banner" role="note">
                  <span className="mock-payment-banner-icon" aria-hidden="true">!</span>
                  <div>
                    <strong>Mock Payment — No Real Card</strong>
                    Bu ödeme adımı simülasyondur. Gerçek bir kart bilgisi girme; son 4 hanesi
                    <code style={{ background: 'rgba(0,0,0,0.08)', padding: '0 4px', borderRadius: 3, margin: '0 4px' }}>0000</code>
                    olan kartlar test amaçlı reddedilir.
                  </div>
                </div>

                {paymentError && <div className="error-message" role="alert">{paymentError}</div>}

                <form onSubmit={handlePaymentSubmit} noValidate>
                  <div className="form-group">
                    <label htmlFor="pay-holder">Kart Üzerindeki Ad</label>
                    <input
                      id="pay-holder"
                      type="text"
                      className="form-input"
                      placeholder="Ad Soyad"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      required
                      autoComplete="cc-name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pay-number">Kart Numarası</label>
                    <input
                      id="pay-number"
                      type="text"
                      className="form-input form-input-mono"
                      placeholder="4242 4242 4242 4242"
                      inputMode="numeric"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      required
                      autoComplete="cc-number"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="pay-expiry">Son Kullanma (AA/YY)</label>
                      <input
                        id="pay-expiry"
                        type="text"
                        className="form-input form-input-mono"
                        placeholder="12/28"
                        inputMode="numeric"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        required
                        autoComplete="cc-exp"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="pay-cvv">CVV</label>
                      <input
                        id="pay-cvv"
                        type="text"
                        className="form-input form-input-mono"
                        placeholder="123"
                        inputMode="numeric"
                        value={cvv}
                        onChange={(e) => setCvv(formatCvv(e.target.value))}
                        required
                        autoComplete="cc-csc"
                      />
                    </div>
                  </div>

                  <div className="checkout-step-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-lg"
                      onClick={() => setStep(STEP_SHIPPING)}
                      disabled={submitting}
                    >
                      ← Geri
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={submitting || state.items.length === 0}
                    >
                      {submitting ? 'İşleniyor...' : 'Siparişi Tamamla'}
                    </button>
                  </div>
                </form>
              </>
            )}
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
