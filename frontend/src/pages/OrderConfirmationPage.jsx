import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import Spinner from '../components/Spinner';
import { api } from '../api';

export default function OrderConfirmationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const order = state?.order;
  const orderId = order?.id;

  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [invoiceError, setInvoiceError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!order) navigate('/');
  }, [order, navigate]);

  useEffect(() => {
    if (!orderId) return undefined;

    let cancelled = false;
    let objectUrl = '';

    const fetchInvoice = async () => {
      setInvoiceLoading(true);
      setInvoiceError('');
      try {
        const blob = await api.getBlob(`/api/orders/${orderId}/invoice`, { accept: 'application/pdf' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setInvoiceUrl(objectUrl);
      } catch (err) {
        if (!cancelled) setInvoiceError(err.message || 'Could not load invoice.');
      } finally {
        if (!cancelled) setInvoiceLoading(false);
      }
    };

    fetchInvoice();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderId]);

  const handleDownload = () => {
    if (!invoiceUrl) return;
    const a = document.createElement('a');
    a.href = invoiceUrl;
    a.download = `invoice-${orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage('');
    setInvoiceError('');
    try {
      const res = await api.post(`/api/orders/${orderId}/invoice/resend`, {});
      setResendMessage(
        res?.email
          ? `Invoice was resent to ${res.email}.`
          : 'Invoice was resent to your email.'
      );
    } catch (err) {
      setInvoiceError(err.message || 'Could not send invoice.');
    } finally {
      setResending(false);
    }
  };

  if (!order) return null;

  return (
    <div className="page">
      <AppHeader showNav={false} />
      <main className="page-body">
        <div className="container-md">
          <div className="settings-card" style={{ margin: '0 auto', maxWidth: 860 }}>
            <div className="confirmation-hero">
              <div className="confirmation-hero-icon" aria-hidden="true">✓</div>
              <h2>Order received!</h2>
              <p>Thanks, your order will be processed shortly.</p>
            </div>

            <div className="order-meta-row">
              <span>Order No</span>
              <strong>{order.id}</strong>
            </div>

            <h2>Order Details</h2>
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

            <div className="checkout-total" style={{ marginBottom: 'var(--space-6)' }}>
              <span>Total</span>
              <span>{order.totalPrice.toFixed(2)} ₺</span>
            </div>

            <h2>Shipping Address</h2>
            <div className="confirmation-address">
              <div><strong>{order.shippingAddress.fullName}</strong></div>
              <div>{order.shippingAddress.address}</div>
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.postalCode}
              </div>
              <div>{order.shippingAddress.country}</div>
            </div>

            <h2>Invoice</h2>

            <section className="invoice-viewer" aria-label="Invoice viewer">
              <div className="invoice-viewer-header">
                <div className="invoice-viewer-title">
                  <strong>Order Invoice</strong>
                  <span>You can view the PDF invoice here; the email is sent in the background.</span>
                </div>
                <div className="invoice-viewer-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? 'Sending...' : 'Resend by Email'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleDownload}
                    disabled={!invoiceUrl || invoiceLoading}
                  >
                    Download Invoice
                  </button>
                </div>
              </div>

              {invoiceLoading && (
                <div className="invoice-viewer-placeholder">
                  <Spinner />
                  <span>Preparing invoice...</span>
                </div>
              )}

              {!invoiceLoading && invoiceError && !invoiceUrl && (
                <div className="invoice-viewer-placeholder" role="alert">
                  <strong>Could not load invoice</strong>
                  <span>{invoiceError}</span>
                  <span style={{ fontSize: 'var(--fs-12)' }}>You can try again from the My Orders page.</span>
                </div>
              )}

              {!invoiceLoading && invoiceUrl && (
                <iframe
                  className="invoice-viewer-frame"
                  src={invoiceUrl}
                  title={`Invoice for order ${order.id}`}
                />
              )}
            </section>

            {resendMessage && (
              <div className="invoice-toast" role="status">{resendMessage}</div>
            )}
            {invoiceError && invoiceUrl && (
              <div className="error-message" role="alert">{invoiceError}</div>
            )}

            <div className="detail-actions" style={{ marginTop: 'var(--space-6)' }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
                Continue Shopping
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => navigate('/orders')}>
                My Orders
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
