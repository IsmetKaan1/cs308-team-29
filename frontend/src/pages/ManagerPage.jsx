import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';
import Stars from '../components/Stars';
import StockPanel from '../components/StockPanel';
import ProductsAdminPanel from '../components/ProductsAdminPanel';
import CategoriesPanel from '../components/CategoriesPanel';
import DeliveriesPanel from '../components/DeliveriesPanel';
import AppHeader from '../components/AppHeader';

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function readStoredManagerUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role === 'product_manager' ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredRole() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw)?.role : null;
  } catch {
    return null;
  }
}

// MAIN MANAGER PANEL — only accessible to users with the product_manager role.
// Redirect to /login if not authenticated or role does not match.
export default function ManagerPage() {
  const navigate = useNavigate();
  const [authedUser, setAuthedUser] = useState(() => readStoredManagerUser());
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
  const authed = !!authedUser;

  const [activeTab, setActiveTab] = useState('pending');
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState({});
  const [feedback, setFeedback] = useState({});

  useEffect(() => {
    if (!hasToken) {
      navigate('/login', { replace: true });
      return;
    }
    if (!authed) {
      const role = readStoredRole();
      if (role === 'sales_manager') navigate('/sales-manager/dashboard', { replace: true });
      else navigate('/login', { replace: true });
    }
  }, [hasToken, authed, navigate]);

  const loadQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = activeTab === 'rejected' ? '/api/reviews/rejected' : '/api/reviews/pending';
      const list = await api.get(endpoint);
      setQueue(list);
    } catch (err) {
      setError(err.message || 'Failed to load reviews.');
      if (err.message && /No token provided|Invalid token|Forbidden|insufficient role/i.test(err.message)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthedUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed && (activeTab === 'pending' || activeTab === 'rejected')) loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, activeTab]);

  const handleModerate = async (reviewId, action) => {
    setBusyIds((s) => ({ ...s, [reviewId]: true }));
    setFeedback((s) => ({ ...s, [reviewId]: null }));
    try {
      await api.patch(`/api/reviews/${reviewId}/moderate`, { action });
      setQueue((list) => list.filter((r) => r.id !== reviewId));
      const labels = { approve: 'Approved.', reject: 'Rejected.', reopen: 'Restored to pending.' };
      setFeedback((s) => ({ ...s, [reviewId]: { type: 'ok', text: labels[action] || 'Updated.' } }));
    } catch (err) {
      setFeedback((s) => ({ ...s, [reviewId]: { type: 'err', text: err.message } }));
    } finally {
      setBusyIds((s) => ({ ...s, [reviewId]: false }));
    }
  };

  if (!authed) return null;

  return (
    <div className="page">
      <AppHeader />

      <div className="manager-subnav">
        <div className="manager-subnav-inner">
          <div className="category-tabs" role="tablist" aria-label="Manager tabs" style={{ marginBottom: 0 }}>
            <button
              type="button"
              role="tab"
              className="category-tab"
              aria-pressed={activeTab === 'pending'}
              onClick={() => setActiveTab('pending')}
            >
              Pending Reviews
            </button>
            <button
              type="button"
              role="tab"
              className="category-tab"
              aria-pressed={activeTab === 'rejected'}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected Reviews
            </button>
            <button
              type="button"
              role="tab"
              className="category-tab"
              aria-pressed={activeTab === 'products'}
              onClick={() => setActiveTab('products')}
            >
              Products
            </button>
            <button
              type="button"
              role="tab"
              className="category-tab"
              aria-pressed={activeTab === 'categories'}
              onClick={() => setActiveTab('categories')}
            >
              Categories
            </button>
            <button
              type="button"
              role="tab"
              className="category-tab"
              aria-pressed={activeTab === 'stock'}
              onClick={() => setActiveTab('stock')}
            >
              Stock
            </button>
            <button
              type="button"
              role="tab"
              className="category-tab"
              aria-pressed={activeTab === 'deliveries'}
              onClick={() => setActiveTab('deliveries')}
            >
              Deliveries
            </button>
          </div>

          {(activeTab === 'pending' || activeTab === 'rejected') && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="category-tab" onClick={loadQueue} disabled={loading}>
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      <main className="page-body">

        {(activeTab === 'pending' || activeTab === 'rejected') && (
          <>
            <div className="container-md" style={{ marginBottom: 'var(--space-5)' }}>
              <div className="page-hero">
                <h1>{activeTab === 'rejected' ? 'Rejected Reviews' : 'Pending Reviews'}</h1>
                <p>
                  {activeTab === 'rejected'
                    ? 'Cancelled rejections are restored to pending review instead of disappearing.'
                    : 'Reviews are hidden from customers until approved.'}
                </p>
              </div>
            </div>

            {loading && <Spinner label="Loading..." />}

            {error && !loading && (
              <div className="container-md">
                <div className="error-message" role="alert">{error}</div>
              </div>
            )}

            {!loading && !error && queue.length === 0 && (
              <div className="container-md">
                <div className="empty-state">
                  <h2>All clear 🎉</h2>
                  <p>{activeTab === 'rejected' ? 'No rejected reviews.' : 'No pending reviews to moderate.'}</p>
                </div>
              </div>
            )}

            {!loading && queue.length > 0 && (
              <div className="container-md">
                <div className="moderation-list">
                {queue.map((r) => (
                  <article key={r.id} className="moderation-card">
                    <div className="moderation-card-head">
                      <div className="moderation-card-product">
                        {r.product && (
                          <strong>
                            {r.product.code} — {r.product.name}
                          </strong>
                        )}
                        <span className="moderation-card-meta">
                          {r.userName || 'Anonymous'} · {formatDate(r.createdAt)}
                        </span>
                      </div>
                      <Stars value={r.rating} size="lg" />
                    </div>

                    {r.comment && <div className="moderation-card-body">{r.comment}</div>}
                    {activeTab === 'rejected' && r.rejectionReason && (
                      <div className="review-status-banner review-status-banner--rejected" style={{ marginTop: 12 }}>
                        Reason: {r.rejectionReason}
                      </div>
                    )}

                    <div className="moderation-card-actions">
                      {activeTab === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!!busyIds[r.id]}
                            onClick={() => handleModerate(r.id, 'approve')}
                          >
                            {busyIds[r.id] ? '...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={!!busyIds[r.id]}
                            onClick={() => handleModerate(r.id, 'reject')}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={!!busyIds[r.id]}
                          onClick={() => handleModerate(r.id, 'reopen')}
                        >
                          {busyIds[r.id] ? '...' : 'Restore to Pending'}
                        </button>
                      )}
                      {feedback[r.id] && (
                        <span
                          className={feedback[r.id].type === 'ok' ? 'order-feedback order-feedback--ok' : 'order-feedback order-feedback--err'}
                        >
                          {feedback[r.id].text}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
                </div>
              </div>
            )}
          </>
        )}


        {activeTab === 'products' && (
          <ProductsAdminPanel />
        )}

        {activeTab === 'categories' && (
          <CategoriesPanel />
        )}

        {activeTab === 'stock' && (
          <StockPanel />
        )}

        {activeTab === 'deliveries' && (
          <DeliveriesPanel />
        )}

      </main>
    </div>
  );
}
