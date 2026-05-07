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
  const searchQuery = searchParams.get('q') || '';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

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
      .catch(() => { if (active) setError('Failed to load courses.'); })
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

  const commitSearch = (raw) => {
    const trimmed = String(raw || '').trim();
    const next = new URLSearchParams(searchParams);
    if (trimmed) next.set('q', trimmed);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    commitSearch(searchInput);
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (!value.trim()) commitSearch('');
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = products;
    if (activeCategory !== ALL) {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (q) {
      list = list.filter((p) => {
        const haystack = [p.name, p.code, p.description, p.model, p.category]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase());
        return haystack.some((text) => text.includes(q));
      });
    }
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const stableId = (a, b) => String(a.id || '').localeCompare(String(b.id || ''));
    if (activeSort === 'price-asc') {
      list = [...list].sort((a, b) => (num(a.price) - num(b.price)) || stableId(a, b));
    } else if (activeSort === 'price-desc') {
      list = [...list].sort((a, b) => (num(b.price) - num(a.price)) || stableId(a, b));
    } else if (activeSort === 'popularity') {
      list = [...list].sort((a, b) => {
        const scoreDiff = num(b.popularityScore) - num(a.popularityScore);
        if (scoreDiff !== 0) return scoreDiff;
        const purchaseDiff = num(b.purchaseCount || b.salesCount) - num(a.purchaseCount || a.salesCount);
        if (purchaseDiff !== 0) return purchaseDiff;
        const ratingDiff = num(b.averageRating) - num(a.averageRating);
        if (ratingDiff !== 0) return ratingDiff;
        const nameDiff = String(a.name || '').localeCompare(String(b.name || ''), 'tr');
        return nameDiff !== 0 ? nameDiff : stableId(a, b);
      });
    }
    return list;
  }, [products, activeCategory, searchQuery, activeSort]);

  const heroSubtitle =
    activeCategory === ALL
      ? 'Find the course you need and add it to your cart.'
      : `Courses in ${activeCategory}.`;

  return (
    <div className="page">
      <AppHeader />

      <main className="page-body">
        <div className="container">
          <div className="page-hero">
            <h1>CS Courses</h1>
            <p>{heroSubtitle}</p>
          </div>

          {categories.length > 0 && (
            <div className="category-tabs" role="tablist" aria-label="Categories">
              <button
                type="button"
                role="tab"
                className="category-tab"
                aria-pressed={activeCategory === ALL}
                onClick={() => handleCategoryChange(ALL)}
              >
                All
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
            <form className="product-toolbar-search" onSubmit={handleSearchSubmit} role="search">
              <input
                type="search"
                className="search-input"
                placeholder="Search courses (name, code or content)..."
                value={searchInput}
                onChange={handleSearchInputChange}
                aria-label="Search courses"
              />
            </form>

            <div className="sort-group">
              <label htmlFor="sort">Sort:</label>
              <select
                id="sort"
                className="sort-select"
                value={activeSort}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                <option value="">Default</option>
                <option value="popularity">Popularity</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {loading && <Spinner label="Loading courses..." />}

          {error && !loading && (
            <div className="empty-block" role="alert">
              <h3>Something went wrong</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="empty-block">
              <h3>No results found</h3>
              <p>
                {activeCategory === ALL
                  ? 'No courses match your search criteria.'
                  : `${searchQuery ? 'No courses found matching your search' : 'No courses yet'} in "${activeCategory}".`}
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
