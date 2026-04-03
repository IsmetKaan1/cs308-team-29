import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import CartIcon from '../components/CartIcon';
import ProfileIcon from '../components/ProfileIcon';
import CartSidebar from '../components/CartSidebar';
import { api } from '../api';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/products')
      .then((data) => setProducts(data))
      .catch(() => setError('Dersler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <h1 style={styles.header}>CS Dersleri</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <CartIcon />
          <ProfileIcon />
        </div>
      </div>
      <div style={{ marginBottom: '30px' }}>
        <input
          type="text"
          placeholder="Ders ara (isim, kod veya içerik)..."
          className="form-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {loading && <p style={styles.status}>Yükleniyor...</p>}
      {error && <p style={{ ...styles.status, color: '#fca5a5' }}>{error}</p>}
      <div style={styles.grid}>
        {products
          .filter(product => 
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
      </div>
      <CartSidebar />
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  header: { color: 'white', margin: 0 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '24px',
  },
  status: { textAlign: 'center', color: 'white', marginBottom: '20px' },
};

export default HomePage;
