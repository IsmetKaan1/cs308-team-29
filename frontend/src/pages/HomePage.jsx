import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import CartSidebar from '../components/CartSidebar';
import AppHeader from '../components/AppHeader';
import Spinner from '../components/Spinner';
import { api } from '../api';

const ALL = 'all';
const VALID_SORTS = new Set(['', 'price-asc', 'price-desc', 'popularity']);

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || ALL;
  const rawSort = searchParams.get('sort') || '';
  const activeSort = VALID_SORTS.has(rawSort) ? rawSort : '';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/api/products'),
      api.get('/api/products/categories').catch(() => []),
    ])
      .then(([productsData, categoriesData]) => {
        if (!active) return;
        setProducts(productsData);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      })
      .catch(() => { if (active) setError('Dersler yüklenemedi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => {
    const map = { [ALL]: products.length };
    for (const c of categories) map[c] = 0;
    for (const p of products) {
      if (p.category in map) map[p.category] += 1;
    }
    return map;
  }, [products, categories]);

  const handleCategoryChange = (category) => {
    const next = new URLSearchParams(searchParams);
    if (category === ALL) next.delete('category');
    else next.set('category', category);
    setSearchParams(next, { replace: true });
  };

  const handleSortChange = (value) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete('sort');
    else next.set('sort', value);
    setSearchParams(next, { replace: true });
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = products;
    if (activeCategory !== ALL) {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (q) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    if (activeSort === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (activeSort === 'popularity') {
      list = [...list].sort((a, b) => {
        const salesDiff = (b.salesCount || 0) - (a.salesCount || 0);
        if (salesDiff !== 0) return salesDiff;
        const ratingDiff = (b.averageRating || 0) - (a.averageRating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return a.name.localeCompare(b.name, 'tr');
      });
    }
    return list;
  }, [products, activeCategory, searchQuery, activeSort]);

  const heroSubtitle =
    activeCategory === ALL
      ? 'İhtiyacın olan dersi bul ve sepete ekle.'
      : `${activeCategory} kategorisindeki dersler.`;

  return (
    <div className="page">
      <AppHeader />

      <main className="page-body">
        <div className="container">
          <div className="page-hero">
            <h1>CS Dersleri</h1>
            <p>{heroSubtitle}</p>
          </div>

          {categories.length > 0 && (
            <div className="category-tabs" role="tablist" aria-label="Kategoriler">
              <button
                type="button"
                role="tab"
                className="category-tab"
                aria-pressed={activeCategory === ALL}
                onClick={() => handleCategoryChange(ALL)}
              >
                Tümü
                <span className="category-tab-count">{counts[ALL] ?? 0}</span>
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  className="category-tab"
                  aria-pressed={activeCategory === c}
                  onClick={() => handleCategoryChange(c)}
                >
                  {c}
                  <span className="category-tab-count">{counts[c] ?? 0}</span>
                </button>
              ))}
            </div>
          )}

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
                value={activeSort}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                <option value="">Varsayılan</option>
                <option value="popularity">Popülerlik</option>
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

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="empty-block">
              <h3>Sonuç bulunamadı</h3>
              <p>
                {activeCategory === ALL
                  ? 'Arama kriterlerine uygun ders bulunamadı.'
                  : `"${activeCategory}" kategorisinde ${searchQuery ? 'aradığın derse' : 'henüz derse'} rastlanmadı.`}
              </p>
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <div className="product-grid">
              {filteredProducts.map((product) => (
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
