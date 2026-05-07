import { useNavigate, useLocation } from 'react-router-dom';
import CartIcon from './CartIcon';
import ProfileIcon from './ProfileIcon';

function readStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const AppHeader = ({ showNav = true }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token');
  const user = isLoggedIn ? readStoredUser() : null;
  const isManager = user?.role === 'product_manager';

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button className="app-brand" onClick={() => navigate('/')} aria-label="Home">
            <span className="app-brand-mark">CS</span>
            <span className="app-brand-title">
              CS Courses
              <small>Sabanci University</small>
            </span>
          </button>
          {showNav && (
            <button
              className="nav-link"
              onClick={() => navigate('/')}
              aria-current={pathname === '/' ? 'page' : undefined}
            >
              Home
            </button>
          )}
        </div>

        <nav className="app-nav" aria-label="Primary">
          {showNav && isManager && (
            <button
              className="nav-link"
              onClick={() => navigate('/manager')}
              aria-current={pathname.startsWith('/manager') ? 'page' : undefined}
            >
              Admin Panel
            </button>
          )}
          {showNav && isLoggedIn && !isManager && (
            <button
              className="nav-link"
              onClick={() => navigate('/orders')}
              aria-current={pathname === '/orders' ? 'page' : undefined}
            >
              My Orders
            </button>
          )}
          {showNav && !isLoggedIn && (
            <button className="nav-link" onClick={() => navigate('/login')}>
              Log In
            </button>
          )}
          <CartIcon />
          <ProfileIcon />
        </nav>
      </div>
    </header>
  );
};

export default AppHeader;
