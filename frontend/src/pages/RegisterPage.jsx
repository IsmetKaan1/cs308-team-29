import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [taxId, setTaxId] = useState('');
  const [homeAddress, setHomeAddress] = useState({
    fullName: '', address: '', city: '', postalCode: '', country: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasMinLength = password.length >= 8;
  const isPasswordValid = hasUppercase && hasLowercase && hasNumber && hasMinLength;

  const handleNext = (e) => {
    e.preventDefault();
    if (email) setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) { setError('Please meet all password requirements.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (taxId && !/^[0-9]{10,11}$/.test(taxId.trim())) {
      setError('Tax ID must be 10 or 11 digits.'); return;
    }

    setLoading(true);
    try {
      const data = await api.post('/api/register', {
        email, username, fullName, gender, password,
        taxId: taxId.trim(),
        homeAddress,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
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
        <button
          type="button"
          className="auth-back"
          onClick={() => (step === 1 ? navigate('/login') : setStep(1))}
        >
          ← {step === 1 ? 'Back to Login' : 'Back'}
        </button>

        <div className="step-indicator" aria-label={`Step ${step} of 2`}>
          <span className={`step-dot ${step >= 1 ? 'active' : ''}`} />
          <span className={`step-dot ${step >= 2 ? 'active' : ''}`} />
        </div>

        <h2>Create Account</h2>
        <p className="subtitle">
          {step === 1 ? "Let's start with your email address" : 'Tell us a bit more about you'}
        </p>

        {error && <div className="error-message">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleNext} noValidate>
            <div className="form-group">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
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
            <button type="submit" className="btn btn-primary btn-block btn-lg">Continue</button>
            <p className="link-text">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-username">Username</label>
                <input
                  id="reg-username"
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  required
                  autoComplete="username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-gender">Gender</label>
                <select
                  id="reg-gender"
                  className="form-select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="" disabled>Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-fullname">Full Name</label>
              <input
                id="reg-fullname"
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                required
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                autoComplete="new-password"
              />
              <ul className="password-rules" aria-label="Password requirements">
                <li className={hasMinLength ? 'valid' : 'invalid'}>
                  {hasMinLength ? '✓' : '○'} At least 8 characters
                </li>
                <li className={hasUppercase ? 'valid' : 'invalid'}>
                  {hasUppercase ? '✓' : '○'} 1 uppercase letter
                </li>
                <li className={hasLowercase ? 'valid' : 'invalid'}>
                  {hasLowercase ? '✓' : '○'} 1 lowercase letter
                </li>
                <li className={hasNumber ? 'valid' : 'invalid'}>
                  {hasNumber ? '✓' : '○'} 1 number
                </li>
              </ul>
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <input
                id="reg-confirm"
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-tax">Tax ID (optional)</label>
              <input
                id="reg-tax"
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
              <legend style={{ padding: '0 6px', fontSize: '0.85rem', color: '#666' }}>Home address (optional)</legend>
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

            <div className="btn-row">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!isPasswordValid || loading}
              >
                {loading ? 'Creating...' : 'Sign Up'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
