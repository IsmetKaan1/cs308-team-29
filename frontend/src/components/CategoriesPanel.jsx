import { useEffect, useState } from 'react';
import { api } from '../api';
import Spinner from './Spinner';

export default function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);
  const [busy, setBusy] = useState(null);
  const [rowMsg, setRowMsg] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [cats, prods] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/products'),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      const counts = {};
      for (const p of prods) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
      setProductCounts(counts);
    } catch (err) {
      setError(err.message || 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      await api.post('/api/categories', { name });
      setNewName('');
      setCreateMsg({ type: 'ok', text: `Created "${name}".` });
      load();
    } catch (err) {
      setCreateMsg({ type: 'err', text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const remove = async (name) => {
    const count = productCounts[name] || 0;
    if (count > 0) {
      setRowMsg((s) => ({ ...s, [name]: { type: 'err', text: `Move/delete the ${count} product(s) first.` } }));
      return;
    }
    if (!confirm(`Delete category "${name}"?`)) return;
    setBusy(name);
    try {
      await api.del(`/api/categories/${encodeURIComponent(name)}`);
      setCategories((list) => list.filter((c) => c !== name));
    } catch (err) {
      setRowMsg((s) => ({ ...s, [name]: { type: 'err', text: err.message } }));
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Spinner label="Loading categories..." />;
  if (error) return <div className="error-message" role="alert">{error}</div>;

  return (
    <div className="container-md">
      <form onSubmit={create} style={{
        background: '#f4f6f8', borderRadius: 8, padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <input
          className="form-input"
          placeholder="New category name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ flex: '1 1 240px' }}
        />
        <button type="submit" className="btn btn-primary" disabled={creating || !newName.trim()}>
          {creating ? 'Adding…' : 'Add category'}
        </button>
        {createMsg && (
          <span style={{ color: createMsg.type === 'ok' ? '#0c7' : '#c33' }}>{createMsg.text}</span>
        )}
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Category</th>
            <th style={{ padding: 8 }}>Products</th>
            <th style={{ padding: 8, width: 240 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c} style={{ borderTop: '1px solid #e5e7eb' }}>
              <td style={{ padding: 8, fontWeight: 600 }}>{c}</td>
              <td style={{ padding: 8 }}>{productCounts[c] || 0}</td>
              <td style={{ padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy === c}
                  onClick={() => remove(c)}
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  Delete
                </button>
                {rowMsg[c] && (
                  <span style={{ color: rowMsg[c].type === 'ok' ? '#0c7' : '#c33', fontSize: '0.8rem' }}>
                    {rowMsg[c].text}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {categories.length === 0 && (
        <div className="empty-state" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          <p>No categories yet. Add one above.</p>
        </div>
      )}
    </div>
  );
}
