import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Spinner from '../components/Spinner';
import Stars from '../components/Stars';

const STORAGE_KEY = 'managerPass';

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}

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
      // Ping the protected endpoint with the password. If it succeeds,
      // we know the pass is right — then persist it for the session.
      await api.managerGet('/api/reviews/pending', password);
      sessionStorage.setItem(STORAGE_KEY, password);
      onAuthed(password);
    } catch (err) {
      setError(err.message || 'Şifre hatalı.');
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
        <button
          type="button"
          className="auth-back"
          onClick={handleBack}
          aria-label="Geri dön"
        >
          ← Geri
        </button>
        <h1>Yönetici Girişi</h1>
        <p>Yorumları onaylamak için yönetici şifresini gir.</p>

        {error && <div className="error-message" role="alert">{error}</div>}

        <div className="form-group">
          <label htmlFor="manager-pass">Şifre</label>
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
          {busy ? 'Kontrol ediliyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}

export default function ManagerPage() {
  const navigate = useNavigate();
  const [pass, setPass] = useState(() => sessionStorage.getItem(STORAGE_KEY) || '');
  const [authed, setAuthed] = useState(!!sessionStorage.getItem(STORAGE_KEY));
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
      setError(err.message || 'Yorumlar yüklenemedi.');
      if (err.message && /Manager authentication/i.test(err.message)) {
        sessionStorage.removeItem(STORAGE_KEY);
        setAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed && pass) loadQueue(pass);
  }, [authed, pass]);

  const handleAuthed = (newPass) => {
    setPass(newPass);
    setAuthed(true);
  };

  const handleModerate = async (reviewId, action) => {
    let rejectionReason = '';
    if (action === 'reject') {
      rejectionReason = window.prompt('Red sebebi (isteğe bağlı):') || '';
    }
    setBusyIds((s) => ({ ...s, [reviewId]: true }));
    setFeedback((s) => ({ ...s, [reviewId]: null }));
    try {
      await api.managerPatch(`/api/reviews/${reviewId}/moderate`, { action, rejectionReason }, pass);
      setQueue((list) => list.filter((r) => r.id !== reviewId));
      setFeedback((s) => ({
        ...s,
        [reviewId]: { type: 'ok', text: action === 'approve' ? 'Onaylandı.' : 'Reddedildi.' },
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
          <button className="app-brand" onClick={() => navigate('/')} aria-label="Ana sayfa">
            <span className="app-brand-mark">CS</span>
            <span className="app-brand-title">
              Yönetici Paneli
              <small>Yorum Onayı</small>
            </span>
          </button>
          <nav className="app-nav">
            <button className="btn btn-ghost-light btn-sm" onClick={() => loadQueue(pass)} disabled={loading}>
              Yenile
            </button>
            <button className="btn btn-ghost-light btn-sm" onClick={handleLogout}>
              Çıkış
            </button>
          </nav>
        </div>
      </header>

      <main className="page-body">
        <div className="container-md" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="page-hero">
            <h1>Bekleyen Yorumlar</h1>
            <p>Onaylayana kadar yorumlar müşterilere görünmez.</p>
          </div>
        </div>

        {loading && <Spinner label="Yükleniyor..." />}

        {error && !loading && (
          <div className="container-md">
            <div className="error-message" role="alert">{error}</div>
          </div>
        )}

        {!loading && !error && queue.length === 0 && (
          <div className="container-md">
            <div className="empty-state">
              <h2>Her şey temiz 🎉</h2>
              <p>Onay bekleyen yorum yok.</p>
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
                      {r.userName || 'Anonim'} · {formatDate(r.createdAt)}
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
                    {busyIds[r.id] ? '...' : 'Onayla'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={!!busyIds[r.id]}
                    onClick={() => handleModerate(r.id, 'reject')}
                  >
                    Reddet
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
      </main>
    </div>
  );
}
