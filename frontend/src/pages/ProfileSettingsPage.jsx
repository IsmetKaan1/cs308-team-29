import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AppHeader from '../components/AppHeader';
import Spinner from '../components/Spinner';

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    api.get('/api/profile')
      .then((data) => {
        setUser(data);
        setUsername(data.username);
        setFullName(data.fullName);
        setGender(data.gender);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      });
  }, [token, navigate]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const data = await api.put('/api/profile', { username, fullName, gender });
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      setMessage('Profil başarıyla güncellendi.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwMessage('');

    if (newPassword !== confirmNewPassword) { setPwError('Yeni şifreler eşleşmiyor.'); return; }
    if (newPassword.length < 8) { setPwError('Yeni şifre en az 8 karakter olmalı.'); return; }

    setPwSaving(true);
    try {
      await api.put('/api/profile/password', { currentPassword, newPassword });
      setPwMessage('Şifre başarıyla değiştirildi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('authChange'));
    navigate('/login');
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  if (!user) {
    return (
      <div className="page">
        <AppHeader showNav={false} />
        <main className="page-body">
          <Spinner label="Yükleniyor..." />
        </main>
      </div>
    );
  }

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="page">
      <AppHeader />
      <main className="page-body">
        <div className="settings-header">
          <div>
            <button
              type="button"
              className="btn btn-ghost btn-sm settings-back-btn"
              onClick={handleBack}
              aria-label="Geri dön"
            >
              ← Geri
            </button>
            <h1>Hesap Ayarları</h1>
            <p style={{ color: 'var(--color-ink-500)', fontSize: 'var(--fs-14)', marginTop: 4 }}>
              Profilini yönet ve şifreni güncelle.
            </p>
          </div>
          <button className="btn btn-danger" onClick={handleLogout}>Çıkış Yap</button>
        </div>

        <div className="settings-card">
          <div className="profile-avatar">
            <div className="avatar-circle">{initials}</div>
            <div className="avatar-info">
              <span className="name">{user.fullName}</span>
              <span className="email">{user.email}</span>
            </div>
          </div>

          <hr className="section-divider" />

          <h2>Profil Bilgileri</h2>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleProfileUpdate} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ps-username">Kullanıcı Adı</label>
                <input
                  id="ps-username"
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="ps-gender">Cinsiyet</label>
                <select
                  id="ps-gender"
                  className="form-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="Male">Erkek</option>
                  <option value="Female">Kadın</option>
                  <option value="Other">Diğer</option>
                  <option value="Prefer not to say">Belirtmek istemiyorum</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ps-fullname">Ad Soyad</label>
              <input
                id="ps-fullname"
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ps-email">E-posta</label>
              <input id="ps-email" type="email" className="form-input" value={user.email} disabled />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </form>

          <hr className="section-divider" />

          <h2>Şifre Değiştir</h2>

          {pwMessage && <div className="success-message">{pwMessage}</div>}
          {pwError && <div className="error-message">{pwError}</div>}

          <form onSubmit={handlePasswordChange} noValidate>
            <div className="form-group">
              <label htmlFor="ps-current-pw">Mevcut Şifre</label>
              <input
                id="ps-current-pw"
                type="password"
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ps-new-pw">Yeni Şifre</label>
                <input
                  id="ps-new-pw"
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="ps-confirm-pw">Yeni Şifre (Tekrar)</label>
                <input
                  id="ps-confirm-pw"
                  type="password"
                  className="form-input"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={pwSaving}>
              {pwSaving ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
