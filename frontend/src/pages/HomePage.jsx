import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import CartSidebar from '../components/CartSidebar';
import AppHeader from '../components/AppHeader';
import Spinner from '../components/Spinner';
import { api } from '../api';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortOption, setSortOption] = useState('');

  useEffect(() => {
    api.get('/api/products')
      .then((data) => setProducts(data))
      .catch(() => setError('Dersler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = products.filter((product) => {
    const q = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(q) ||
      product.code.toLowerCase().includes(q) ||
      product.description.toLowerCase().includes(q)
    );
  });

  const sortedProducts = [...filteredProducts];
  if (sortOption === 'price-asc') sortedProducts.sort((a, b) => a.price - b.price);
  else if (sortOption === 'price-desc') sortedProducts.sort((a, b) => b.price - a.price);

  return (
    <div className="page">
      <AppHeader />

      <main className="page-body">
        <div className="container">
          <div className="page-hero">
            <h1>CS Dersleri</h1>
            <p>İhtiyacın olan dersi bul ve sepete ekle.</p>
          </div>

          <div className="product-toolbar">
            <div className="product-toolbar-search">
              <input
                type="search"
                className="search-input"
                placeholder="Ders ara (isim, kod veya içerik)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Ders ara"
              />
            </div>

            <div className="sort-group">
              <label htmlFor="sort">Sırala:</label>
              <select
                id="sort"
                className="sort-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="">Varsayılan</option>
                <option value="price-asc">Artan Fiyat</option>
                <option value="price-desc">Azalan Fiyat</option>
              </select>
            </div>
          </div>

          {loading && <Spinner label="Dersler yükleniyor..." />}

          {error && !loading && (
            <div className="empty-block" role="alert">
              <h3>Bir sorun oluştu</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && sortedProducts.length === 0 && (
            <div className="empty-block">
              <h3>Sonuç bulunamadı</h3>
              <p>Arama kriterlerine uygun ders bulunamadı.</p>
            </div>
          )}

          {!loading && !error && sortedProducts.length > 0 && (
            <div className="product-grid">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>

      <CartSidebar />
    </div>
  );
};

export default HomePage;
