import { useEffect, useState } from 'react';
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

function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey());

  const isGuest = !localStorage.getItem('token');

  useEffect(() => {
    if (isGuest) return;
    api.get('/api/profile').then((data) => {
      const a = data.homeAddress || {};
      if (a.fullName && !fullName) setFullName(a.fullName);
      if (a.address && !address) setAddress(a.address);
      if (a.city && !city) setCity(a.city);
      if (a.postalCode && !postalCode) setPostalCode(a.postalCode);
      if (a.country && !country) setCountry(a.country);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isGuest) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h2>Login Required</h2>
          <p className="subtitle">Please sign in to continue to checkout.</p>
          <button className="btn btn-primary btn-block btn-lg" onClick={() => navigate('/login')}>
            Sign In
          </button>
          <p className="link-text">
            Don't have an account?{' '}
            <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>
              Sign Up
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
      setShippingError('Your cart is empty.');
      return;
    }
    const addr = shippingAddressObject();
    if (Object.values(addr).some((v) => !v)) {
      setShippingError('Please fill in all shipping address fields.');
      return;
    }
    setIdempotencyKey(createIdempotencyKey());
    setStep(STEP_PAYMENT);
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    setPaymentError('');

    const digits = cardNumber.replace(/\D+/g, '');
    if (!cardHolder.trim()) { setPaymentError('Cardholder name is required.'); return; }
    if (digits.length !== 16) { setPaymentError('Card number must be 16 digits.'); return; }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) { setPaymentError('Expiry must be in MM/YY format.'); return; }
    if (cvv.length !== 3) { setPaymentError('CVV must be 3 digits.'); return; }

    setSubmitting(true);
    try {
      const payment = await api.post('/api/payments/mock', {
        cardHolderName: cardHolder.trim(),
        cardNumber: digits,
        expiry,
        cvv,
      });

      if (!payment.approved) {
        setPaymentError(payment.error || 'Payment declined. Please try a different card.');
        setIdempotencyKey(createIdempotencyKey());
        return;
      }

      const order = await api.post('/api/orders', {
        items: state.items,
        shippingAddress: shippingAddressObject(),
        paymentTransactionId: payment.transactionId,
      }, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      setIdempotencyKey(createIdempotencyKey());
      dispatch({ type: 'CLEAR_CART' });
      navigate('/order-confirmation', { state: { order } });
    } catch (err) {
      setPaymentError(err.message || 'An error occurred during payment.');
      setIdempotencyKey(createIdempotencyKey());
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
              <h1>Checkout</h1>
              <p>Enter your shipping details and complete the secure payment.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>← Back to Shop</button>
          </div>
        </div>

        <div className="checkout-layout">
          <div className="checkout-form-card">
            <div className="checkout-steps" role="tablist" aria-label="Checkout steps">
              <div
                className={`checkout-step ${step === STEP_SHIPPING ? 'is-active' : 'is-done'}`}
                role="tab"
                aria-selected={step === STEP_SHIPPING}
              >
                <span className="checkout-step-num">{step === STEP_SHIPPING ? '1' : '✓'}</span>
                Shipping
              </div>
              <div className={`checkout-step-sep ${step === STEP_PAYMENT ? 'is-done' : ''}`} />
              <div
                className={`checkout-step ${step === STEP_PAYMENT ? 'is-active' : ''}`}
                role="tab"
                aria-selected={step === STEP_PAYMENT}
              >
                <span className="checkout-step-num">2</span>
                Payment
              </div>
            </div>

            {step === STEP_SHIPPING && (
              <>
                <h2 className="card-title">Shipping Address</h2>

                {shippingError && <div className="error-message">{shippingError}</div>}

                <form onSubmit={handleContinueToPayment} noValidate>
                  <div className="form-group">
                    <label htmlFor="co-name">Full Name</label>
                    <input
                      id="co-name"
                      type="text"
                      className="form-input"
                      placeholder="Full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="co-addr">Address</label>
                    <input
                      id="co-addr"
                      type="text"
                      className="form-input"
                      placeholder="Street, building no"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      autoComplete="street-address"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="co-city">City</label>
                      <input
                        id="co-city"
                        type="text"
                        className="form-input"
                        placeholder="Istanbul"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        autoComplete="address-level2"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="co-postal">Postal Code</label>
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
                    <label htmlFor="co-country">Country</label>
                    <input
                      id="co-country"
                      type="text"
                      className="form-input"
                      placeholder="Turkey"
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
                    Continue to Payment
                  </button>
                </form>
              </>
            )}

            {step === STEP_PAYMENT && (
              <>
                <h2 className="card-title">Card Details</h2>

                <div className="mock-payment-banner" role="note">
                  <span className="mock-payment-banner-icon" aria-hidden="true">!</span>
                  <div>
                    <strong>Mock Payment — No Real Card</strong>
                    This payment step is a simulation. Do not enter real card details; cards ending with
                    <code style={{ background: 'rgba(0,0,0,0.08)', padding: '0 4px', borderRadius: 3, margin: '0 4px' }}>0000</code>
                    are declined for testing.
                  </div>
                </div>

                {paymentError && <div className="error-message" role="alert">{paymentError}</div>}

                <form onSubmit={handlePaymentSubmit} noValidate>
                  <div className="form-group">
                    <label htmlFor="pay-holder">Cardholder Name</label>
                    <input
                      id="pay-holder"
                      type="text"
                      className="form-input"
                      placeholder="Full name"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      required
                      autoComplete="cc-name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pay-number">Card Number</label>
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
                      <label htmlFor="pay-expiry">Expiry (MM/YY)</label>
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
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={submitting || state.items.length === 0}
                    >
                      {submitting ? 'Processing...' : 'Place Order'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          <aside className="checkout-summary-card" aria-label="Order summary">
            <h2>Order Summary</h2>

            {state.items.length === 0 ? (
              <p className="cart-empty">Your cart is empty.</p>
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
                  <span>Total</span>
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
