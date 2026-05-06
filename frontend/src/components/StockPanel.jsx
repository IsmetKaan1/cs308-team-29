import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import Spinner from './Spinner';

export default function StockPanel({ managerPass }) {
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
  }, [currentSearch, currentSort, currentCategory, managerPass]);

  const fetchStock = async () => {
    setLoading(true);
    setError('');
    try {
      
      const query = new URLSearchParams({
        ...(currentSearch && { q: currentSearch }),
        ...(currentSort && { sort: currentSort }),
        ...(currentCategory && { category: currentCategory })
      }).toString();

      const data = await api.managerGet(`/api/products/stock?${query}`, managerPass);
      setProducts(data);
      setStockDrafts(
        Object.fromEntries(
          data.map((product) => [
            product.id,
            String(product.quantityInStock ?? product.stock ?? 0),
          ])
        )
      );
    } catch (err) {
      setError('Failed to load stock data or endpoint is not ready.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (searchInput.trim()) {
        next.set('q', searchInput.trim());
      } else {
        next.delete('q'); 
      }
      return next;
    });
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
        [product.id]: { type: 'err', text: 'Stock must be a non-negative integer.' },
      }));
      return;
    }

    setUpdatingIds((prev) => ({ ...prev, [product.id]: true }));
    setFeedback((prev) => ({ ...prev, [product.id]: null }));
    try {
      const updated = await api.managerPatch(
        `/api/products/${product.id}/stock`,
        { quantityInStock },
        managerPass
      );
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setStockDrafts((prev) => ({ ...prev, [updated.id]: String(updated.quantityInStock ?? 0) }));
      setFeedback((prev) => ({
        ...prev,
        [product.id]: { type: 'ok', text: 'Saved.' },
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

  return (
    <div className="container-md">
      <div className="filters-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by product name or description..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        <select value={currentSort} onChange={handleSort} className="form-input" style={{ width: 'auto' }}>
          <option value="">Default Sort</option>
          <option value="price_asc">Price (Low to High)</option>
          <option value="price_desc">Price (High to Low)</option>
          <option value="popularity">Popularity</option>
        </select>

        <select value={currentCategory} onChange={handleCategory} className="form-input" style={{ width: 'auto' }}>
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {loading && <Spinner label="Loading stock data..." />}
      {error && <div className="error-message">{error}</div>}
      
      {!loading && !error && products.length === 0 && (
        <div className="empty-state">
          <p>No products found matching the criteria.</p>
        </div>
      )}

      {/* Product stock table skeleton */}
      {!loading && products.length > 0 && (
        <table className="table" style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>Product Code</th>
              <th>Name</th>
              <th>Stock</th>
              <th>Popularity</th>
              <th>Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const currentStock = p.quantityInStock ?? p.stock ?? 0;
              const draft = stockDrafts[p.id] ?? String(currentStock);
              const changed = Number(draft) !== currentStock;
              return (
                <tr key={p.id}>
                  <td>{p.code}</td>
                  <td>{p.name}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input"
                      value={draft}
                      onChange={(e) => handleStockDraftChange(p.id, e.target.value)}
                      style={{ maxWidth: 110 }}
                      aria-label={`${p.code} stock`}
                    />
                  </td>
                  <td>{p.popularityScore ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={updatingIds[p.id] || !changed || draft === ''}
                      onClick={() => handleStockUpdate(p)}
                    >
                      {updatingIds[p.id] ? 'Saving...' : 'Update'}
                    </button>
                  </td>
                  <td>
                    {feedback[p.id] && (
                      <span
                        className={`order-feedback ${
                          feedback[p.id].type === 'ok'
                            ? 'order-feedback--ok'
                            : 'order-feedback--err'
                        }`}
                      >
                        {feedback[p.id].text}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
