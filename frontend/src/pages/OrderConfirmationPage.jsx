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
        if (!cancelled) setInvoiceError(err.message || 'Fatura yüklenemedi.');
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
          ? `Fatura ${res.email} adresine tekrar gönderildi.`
          : 'Fatura e-posta adresine tekrar gönderildi.'
      );
    } catch (err) {
      setInvoiceError(err.message || 'Fatura gönderilemedi.');
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

            <div className="checkout-total" style={{ marginBottom: 'var(--space-6)' }}>
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

            <h2>Fatura</h2>

            <section className="invoice-viewer" aria-label="Fatura görüntüleyici">
              <div className="invoice-viewer-header">
                <div className="invoice-viewer-title">
                  <strong>Sipariş Faturası</strong>
                  <span>PDF kopyası e-posta adresine de gönderildi.</span>
                </div>
                <div className="invoice-viewer-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? 'Gönderiliyor...' : 'E-posta ile Tekrar Gönder'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleDownload}
                    disabled={!invoiceUrl || invoiceLoading}
                  >
                    Faturayı İndir
                  </button>
                </div>
              </div>

              {invoiceLoading && (
                <div className="invoice-viewer-placeholder">
                  <Spinner />
                  <span>Fatura hazırlanıyor...</span>
                </div>
              )}

              {!invoiceLoading && invoiceError && !invoiceUrl && (
                <div className="invoice-viewer-placeholder" role="alert">
                  <strong>Fatura yüklenemedi</strong>
                  <span>{invoiceError}</span>
                  <span style={{ fontSize: 'var(--fs-12)' }}>
                    PDF kopyası yine de e-posta adresine gönderildi.
                  </span>
                </div>
              )}

              {!invoiceLoading && invoiceUrl && (
                <iframe
                  className="invoice-viewer-frame"
                  src={invoiceUrl}
                  title={`Sipariş ${order.id} faturası`}
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
