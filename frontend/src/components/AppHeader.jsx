import { useNavigate, useLocation } from 'react-router-dom';
import CartIcon from './CartIcon';
import ProfileIcon from './ProfileIcon';

const AppHeader = ({ showNav = true }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token');

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <button className="app-brand" onClick={() => navigate('/')} aria-label="Ana sayfa">
          <span className="app-brand-mark">CS</span>
          <span className="app-brand-title">
            CS Dersleri
            <small>Sabancı Üniversitesi</small>
          </span>
        </button>

        <nav className="app-nav" aria-label="Primary">
          {showNav && isLoggedIn && (
            <button
              className="nav-link"
              onClick={() => navigate('/orders')}
              aria-current={pathname === '/orders' ? 'page' : undefined}
            >
              Siparişlerim
            </button>
          )}
          {showNav && !isLoggedIn && (
            <button className="nav-link" onClick={() => navigate('/login')}>
              Giriş Yap
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
