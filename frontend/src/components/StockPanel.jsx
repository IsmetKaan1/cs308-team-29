import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import Spinner from './Spinner';

export default function StockPanel() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentSearch = searchParams.get('q') || '';
  const currentSort = searchParams.get('sort') || '';
  const currentCategory = searchParams.get('category') || '';

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockDrafts, setStockDrafts] = useState({});
  const [updatingIds, setUpdatingIds] = useState({});
  const [feedback, setFeedback] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/products/categories')
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setSearchInput(currentSearch);
    fetchStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearch, currentSort, currentCategory]);

  const fetchStock = async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({
        ...(currentSearch && { q: currentSearch }),
        ...(currentSort && { sort: currentSort }),
        ...(currentCategory && { category: currentCategory }),
      }).toString();

      const data = await api.get(`/api/products/stock?${query}`);
      setProducts(data);
      setStockDrafts(
        Object.fromEntries(
          data.map((product) => [
            product.id,
            String(product.quantityInStock ?? product.stock ?? 0),
          ])
        )
      );
    } catch {
      setError('Failed to load stock data.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (searchInput.trim()) next.set('q', searchInput.trim());
      else next.delete('q');
      return next;
    });
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (!value.trim() && currentSearch) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('q');
        return next;
      });
    }
  };

  const handleStockDraftChange = (productId, value) => {
    const digitsOnly = value.replace(/\D+/g, '');
    setStockDrafts((prev) => ({ ...prev, [productId]: digitsOnly }));
    setFeedback((prev) => ({ ...prev, [productId]: null }));
  };

  const handleStockUpdate = async (product) => {
    const rawValue = stockDrafts[product.id];
    const quantityInStock = Number(rawValue);

    if (!Number.isInteger(quantityInStock) || quantityInStock < 0) {
      setFeedback((prev) => ({
        ...prev,
        [product.id]: { type: 'err', text: 'Invalid value.' },
      }));
      return;
    }

    setUpdatingIds((prev) => ({ ...prev, [product.id]: true }));
    setFeedback((prev) => ({ ...prev, [product.id]: null }));
    try {
      const updated = await api.patch(
        `/api/products/${product.id}/stock`,
        { quantityInStock }
      );
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setStockDrafts((prev) => ({ ...prev, [updated.id]: String(updated.quantityInStock ?? 0) }));
      setFeedback((prev) => ({
        ...prev,
        [product.id]: { type: 'ok', text: 'Saved' },
      }));
    } catch (err) {
      setFeedback((prev) => ({
        ...prev,
        [product.id]: { type: 'err', text: err.message || 'Could not update.' },
      }));
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const handleSort = (e) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('sort', val);
      else next.delete('sort');
      return next;
    });
  };

  const handleCategory = (e) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('category', val);
      else next.delete('category');
      return next;
    });
  };

  const smallBtn = {
    padding: '6px 12px',
    fontSize: 'var(--fs-13)',
    borderRadius: 'var(--radius-md)',
  };
  const cellInput = {
    width: 90,
    padding: '6px 10px',
    fontSize: 'var(--fs-13)',
  };

  return (
    <div className="container-md">
      <div className="page-hero">
        <h1>Stock Management</h1>
        <p>Edit the stock counts of products.</p>
      </div>

      <form
        onSubmit={handleSearch}
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
        }}
      >
        <input
          type="search"
          className="form-input"
          placeholder="Search products..."
          value={searchInput}
          onChange={handleSearchInputChange}
          style={{ flex: '1 1 220px', minWidth: 180 }}
        />
        <select value={currentSort} onChange={handleSort} className="form-input" style={{ width: 'auto' }}>
          <option value="">Sort</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="popularity">Popularity</option>
        </select>
        <select value={currentCategory} onChange={handleCategory} className="form-input" style={{ width: 'auto' }}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </form>

      {loading && <Spinner label="Loading..." />}
      {error && !loading && <div className="error-message">{error}</div>}

      {!loading && !error && products.length === 0 && (
        <div className="empty-state">
          <p>No products match these criteria.</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', textAlign: 'left', fontSize: 'var(--fs-14)' }}>
            <thead>
              <tr style={{ color: 'var(--color-ink-500)', fontWeight: 'var(--fw-medium)' }}>
                <th style={{ padding: '10px 12px' }}>Code</th>
                <th style={{ padding: '10px 12px' }}>Name</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>Stock</th>
                <th style={{ padding: '10px 12px' }}>Popularity</th>
                <th style={{ padding: '10px 12px' }} aria-label="Action"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const currentStock = p.quantityInStock ?? p.stock ?? 0;
                const draft = stockDrafts[p.id] ?? String(currentStock);
                const changed = Number(draft) !== currentStock;
                const fb = feedback[p.id];
                return (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--color-ink-100)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{p.code}</td>
                    <td style={{ padding: '10px 12px' }}>{p.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-ink-500)' }}>{p.category}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="form-input"
                        value={draft}
                        onChange={(e) => handleStockDraftChange(p.id, e.target.value)}
                        style={cellInput}
                        aria-label={`${p.code} stock`}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-ink-600)' }}>{p.popularityScore ?? 0}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={smallBtn}
                        disabled={updatingIds[p.id] || !changed || draft === ''}
                        onClick={() => handleStockUpdate(p)}
                      >
                        {updatingIds[p.id] ? '...' : 'Save'}
                      </button>
                      {fb && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 'var(--fs-12)',
                            color: fb.type === 'ok' ? 'var(--color-success-700, #15803d)' : 'var(--color-danger-700, #b91c1c)',
                          }}
                        >
                          {fb.text}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
