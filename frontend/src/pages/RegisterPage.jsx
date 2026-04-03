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

    if (!isPasswordValid) {
      setError('Please meet all password requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/api/register', { email, username, fullName, gender, password });
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
          className="btn-secondary" 
          onClick={() => navigate('/login')} 
          style={{ marginBottom: '15px', padding: '8px 12px', width: 'auto', alignSelf: 'flex-start', display: 'flex', gap: '6px' }}
        >
          &larr; Back to Login
        </button>
        <div className="step-indicator">
          <span className={`step-dot ${step >= 1 ? 'active' : ''}`} />
          <span className={`step-dot ${step >= 2 ? 'active' : ''}`} />
        </div>

        <h2>Create Account</h2>
        <p className="subtitle">
          {step === 1 ? "Let's start with your email" : 'Tell us more about yourself'}
        </p>

        {error && <div className="error-message">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleNext}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn-primary">Continue</button>
            <p className="link-text">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  required
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select
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
              <label>Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
              />
              <ul className="password-rules">
                <li className={hasMinLength ? 'valid' : 'invalid'}>
                  {hasMinLength ? '\u2713' : '\u2717'} At least 8 characters
                </li>
                <li className={hasUppercase ? 'valid' : 'invalid'}>
                  {hasUppercase ? '\u2713' : '\u2717'} At least 1 uppercase letter
                </li>
                <li className={hasLowercase ? 'valid' : 'invalid'}>
                  {hasLowercase ? '\u2713' : '\u2717'} At least 1 lowercase letter
                </li>
                <li className={hasNumber ? 'valid' : 'invalid'}>
                  {hasNumber ? '\u2713' : '\u2717'} At least 1 number
                </li>
              </ul>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
              />
            </div>

            <div className="btn-row">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={!isPasswordValid || loading}>
                {loading ? 'Creating...' : 'Sign Up'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
