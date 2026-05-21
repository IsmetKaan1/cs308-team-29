import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import AppHeader from '../components/AppHeader';
import CartSidebar from '../components/CartSidebar';
import Spinner from '../components/Spinner';

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [taxId, setTaxId] = useState('');
  const [homeAddress, setHomeAddress] = useState({
    fullName: '', address: '', city: '', postalCode: '', country: '',
  });
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
        setTaxId(data.taxId || '');
        setHomeAddress({
          fullName: data.homeAddress?.fullName || '',
          address: data.homeAddress?.address || '',
          city: data.homeAddress?.city || '',
          postalCode: data.homeAddress?.postalCode || '',
          country: data.homeAddress?.country || '',
        });
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
    if (taxId && !/^[0-9]{10,11}$/.test(taxId.trim())) {
      setError('Tax ID must be 10 or 11 digits.');
      setSaving(false);
      return;
    }
    try {
      const data = await api.put('/api/profile', {
        username, fullName, gender,
        taxId: taxId.trim(),
        homeAddress,
      });
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      setMessage('Profile updated successfully.');
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

    if (newPassword !== confirmNewPassword) { setPwError('New passwords do not match.'); return; }
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return; }

    setPwSaving(true);
    try {
      await api.put('/api/profile/password', { currentPassword, newPassword });
      setPwMessage('Password changed successfully.');
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
          <Spinner label="Loading..." />
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
              aria-label="Go back"
            >
              ← Back
            </button>
            <h1>Account Settings</h1>
            <p style={{ color: 'var(--color-ink-500)', fontSize: 'var(--fs-14)', marginTop: 4 }}>
              Manage your profile and update your password.
            </p>
          </div>
          <button className="btn btn-danger" onClick={handleLogout}>Log Out</button>
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

          <h2>Profile Information</h2>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleProfileUpdate} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ps-username">Username</label>
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
                <label htmlFor="ps-gender">Gender</label>
                <select
                  id="ps-gender"
                  className="form-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ps-fullname">Full Name</label>
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
              <label htmlFor="ps-email">Email</label>
              <input id="ps-email" type="email" className="form-input" value={user.email} disabled />
            </div>

            <div className="form-group">
              <label htmlFor="ps-tax">Tax ID</label>
              <input
                id="ps-tax"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{10,11}"
                className="form-input"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="10 or 11 digits"
              />
            </div>

            <fieldset className="form-group" style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <legend style={{ padding: '0 6px', fontSize: '0.85rem', color: 'var(--color-ink-500)' }}>Home address</legend>
              <input className="form-input" style={{ marginBottom: 6 }} placeholder="Recipient name"
                value={homeAddress.fullName}
                onChange={(e) => setHomeAddress({ ...homeAddress, fullName: e.target.value })}
              />
              <input className="form-input" style={{ marginBottom: 6 }} placeholder="Street address"
                value={homeAddress.address}
                onChange={(e) => setHomeAddress({ ...homeAddress, address: e.target.value })}
              />
              <div className="form-row">
                <input className="form-input" placeholder="City"
                  value={homeAddress.city}
                  onChange={(e) => setHomeAddress({ ...homeAddress, city: e.target.value })}
                />
                <input className="form-input" placeholder="Postal code"
                  value={homeAddress.postalCode}
                  onChange={(e) => setHomeAddress({ ...homeAddress, postalCode: e.target.value })}
                />
              </div>
              <input className="form-input" style={{ marginTop: 6 }} placeholder="Country"
                value={homeAddress.country}
                onChange={(e) => setHomeAddress({ ...homeAddress, country: e.target.value })}
              />
            </fieldset>

            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          <hr className="section-divider" />

          <h2>Change Password</h2>

          {pwMessage && <div className="success-message">{pwMessage}</div>}
          {pwError && <div className="error-message">{pwError}</div>}

          <form onSubmit={handlePasswordChange} noValidate>
            <div className="form-group">
              <label htmlFor="ps-current-pw">Current Password</label>
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
                <label htmlFor="ps-new-pw">New Password</label>
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
                <label htmlFor="ps-confirm-pw">Confirm New Password</label>
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
              {pwSaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </main>
      <CartSidebar />
    </div>
  );
}
