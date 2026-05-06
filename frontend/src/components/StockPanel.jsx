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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      if (searchInput.trim()) {
        prev.set('q', searchInput.trim());
      } else {
        prev.delete('q'); 
      }
      return prev;
    });
  };

  const handleSort = (e) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      if (val) prev.set('sort', val);
      else prev.delete('sort');
      return prev; 
    });
  };

  const handleCategory = (e) => {
    const val = e.target.value;
    setSearchParams((prev) => {
      if (val) prev.set('category', val);
      else prev.delete('category');
      return prev;
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
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.code}</td>
                <td>{p.name}</td>
                <td>{p.stock}</td>
                <td>
                  <button className="btn btn-sm btn-ghost-light">Update</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}