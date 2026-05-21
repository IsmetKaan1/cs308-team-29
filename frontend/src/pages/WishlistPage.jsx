import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';
import { api } from '../api';

export default function WishlistPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' && localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    api.get('/api/wishlist')
      .then((data) => setItems(data))
      .catch((err) => setError(err.message || 'Failed to load wishlist.'))
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="page">
      <AppHeader />
      <main className="page-body">
        <div className="container">
          <div className="page-hero">
            <h1>My Wishlist</h1>
            <p>Tap the heart on a product to add it here. You'll get an email when items on this list go on sale.</p>
          </div>

          {loading && <Spinner label="Loading..." />}
          {error && <div className="error-message" role="alert">{error}</div>}

          {!loading && !error && items.length === 0 && (
            <div className="empty-block">
              <h3>Your wishlist is empty</h3>
              <p>Browse courses and tap ♡ to save them here.</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="product-grid">
              {items.map(({ product }) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
