import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';
import Stars from '../components/Stars';
import StockPanel from '../components/StockPanel'; 

const STORAGE_KEY = 'managerPass';

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// YÖNETİCİ GİRİŞ EKRANI
function ManagerGate({ onAuthed }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.managerGet('/api/reviews/pending', password);
      sessionStorage.setItem(STORAGE_KEY, password);
      onAuthed(password);
    } catch (err) {
      setError(err.message || 'Incorrect password.');
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/login');
  };

  return (
    <div className="manager-gate">
      <form className="manager-gate-card" onSubmit={handleSubmit} noValidate>
        <button type="button" className="auth-back" onClick={handleBack} aria-label="Go back">
          ← Back
        </button>
        <h1>Manager Login</h1>
        <p>Enter the manager password to access the panel.</p>

        {error && <div className="error-message" role="alert">{error}</div>}

        <div className="form-group">
          <label htmlFor="manager-pass">Password</label>
          <input
            id="manager-pass"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy || !password}>
          {busy ? 'Checking...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

// ANA YÖNETİCİ PANELİ
export default function ManagerPage() {
  const navigate = useNavigate();
  const [pass, setPass] = useState(() => sessionStorage.getItem(STORAGE_KEY) || '');
  const [authed, setAuthed] = useState(!!sessionStorage.getItem(STORAGE_KEY));
  
 
  const [activeTab, setActiveTab] = useState('reviews'); 

  // Yorumlar için olan eski state'lerin
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState({});
  const [feedback, setFeedback] = useState({});

  const loadQueue = async (managerPass) => {
    setLoading(true);
    setError('');
    try {
      const list = await api.managerGet('/api/reviews/pending', managerPass);
      setQueue(list);
    } catch (err) {
      setError(err.message || 'Failed to load reviews.');
      if (err.message && /Manager authentication/i.test(err.message)) {
        sessionStorage.removeItem(STORAGE_KEY);
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
 
    if (authed && pass && activeTab === 'reviews') loadQueue(pass);
  }, [authed, pass, activeTab]);

  const handleAuthed = (newPass) => {
    setPass(newPass);
    setAuthed(true);
  };

  const handleModerate = async (reviewId, action) => {
    let rejectionReason = '';
    if (action === 'reject') {
      rejectionReason = window.prompt('Reason for rejection (optional):') || '';
    }
    setBusyIds((s) => ({ ...s, [reviewId]: true }));
    setFeedback((s) => ({ ...s, [reviewId]: null }));
    try {
      await api.managerPatch(`/api/reviews/${reviewId}/moderate`, { action, rejectionReason }, pass);
      setQueue((list) => list.filter((r) => r.id !== reviewId));
      setFeedback((s) => ({
        ...s,
        [reviewId]: { type: 'ok', text: action === 'approve' ? 'Approved.' : 'Rejected.' },
      }));
    } catch (err) {
      setFeedback((s) => ({ ...s, [reviewId]: { type: 'err', text: err.message } }));
    } finally {
      setBusyIds((s) => ({ ...s, [reviewId]: false }));
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setPass('');
    setAuthed(false);
    setQueue([]);
  };

  if (!authed) {
    return <ManagerGate onAuthed={handleAuthed} />;
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <button className="app-brand" onClick={() => navigate('/')} aria-label="Home page">
            <span className="app-brand-mark">CS</span>
            <span className="app-brand-title">
              Manager Panel
            </span>
          </button>
          <nav className="app-nav">

            <button 
              className={`btn ${activeTab === 'reviews' ? 'btn-primary' : 'btn-ghost-light'} btn-sm`} 
              onClick={() => setActiveTab('reviews')}
            >
              Pending Reviews
            </button>
            <button 
              className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-ghost-light'} btn-sm`} 
              onClick={() => setActiveTab('stock')}
            >
              Stock Management
            </button>

            {activeTab === 'reviews' && (
              <button className="btn btn-ghost-light btn-sm" onClick={() => loadQueue(pass)} disabled={loading}>
                Refresh
              </button>
            )}
            <button className="btn btn-ghost-light btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="page-body">
        
        {activeTab === 'reviews' && (
          <>
            <div className="container-md" style={{ marginBottom: 'var(--space-5)' }}>
              <div className="page-hero">
                <h1>Pending Reviews</h1>
                <p>Reviews are hidden from customers until approved.</p>
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
                  <p>No pending reviews to moderate.</p>
                </div>
              </div>
            )}

            {!loading && queue.length > 0 && (
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

                    <div className="moderation-card-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={!!busyIds[r.id]}
                        onClick={() => handleModerate(r.id, 'approve')}
                      >
                        {busyIds[r.id] ? '...' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={!!busyIds[r.id]}
                        onClick={() => handleModerate(r.id, 'reject')}
                      >
                        Reject
                      </button>
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
            )}
          </>
        )}


        {activeTab === 'stock' && (
          <StockPanel managerPass={pass} />
        )}

      </main>
    </div>
  );
}