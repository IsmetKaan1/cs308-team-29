import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.post('/api/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('authChange'));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button type="button" className="auth-back" onClick={() => navigate('/')}>
          ← Ana sayfa
        </button>
        <h2>Tekrar hoşgeldin</h2>
        <p className="subtitle">Hesabına giriş yap</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <div className="input-with-addon">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifreni gir"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-addon-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? <><span className="spinner spinner--sm spinner--light" /> Giriş yapılıyor...</> : 'Giriş Yap'}
          </button>
        </form>

        <p className="link-text">
          Hesabın yok mu? <Link to="/register">Kayıt ol</Link>
        </p>

        <p className="link-text" style={{ marginTop: 4, fontSize: 'var(--fs-12)' }}>
          <Link to="/manager">Yönetici girişi</Link>
        </p>
      </div>
    </div>
  );
}
