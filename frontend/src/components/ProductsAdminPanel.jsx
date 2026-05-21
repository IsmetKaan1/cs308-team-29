import { useEffect, useState } from 'react';
import { api } from '../api';
import Spinner from './Spinner';

const EMPTY_DRAFT = {
  code: '', name: '', description: '', price: '', category: '',
  serialNumber: '', quantityInStock: '0', warrantyMonths: '12',
  distributorInfo: '', model: '', cost: '0',
};

export default function ProductsAdminPanel() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rowMsg, setRowMsg] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [prods, cats] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/categories').catch(() => []),
      ]);
      setProducts(prods);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) {
      setError(err.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    try {
      await api.post('/api/products', {
        code: draft.code,
        name: draft.name,
        description: draft.description,
        price: Number(draft.price),
        cost: Number(draft.cost),
        category: draft.category,
        serialNumber: draft.serialNumber,
        quantityInStock: Number(draft.quantityInStock),
        warrantyMonths: Number(draft.warrantyMonths),
        distributorInfo: draft.distributorInfo,
        model: draft.model,
      });
      setCreateMsg({ type: 'ok', text: 'Product created.' });
      setDraft(EMPTY_DRAFT);
      load();
    } catch (err) {
      setCreateMsg({ type: 'err', text: err.message });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditDraft({
      code: p.code, name: p.name, description: p.description,
      category: p.category, serialNumber: p.serialNumber,
      warrantyMonths: String(p.warrantyMonths ?? 0),
      distributorInfo: p.distributorInfo, model: p.model,
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };

  const setEditField = (key, value) => setEditDraft((d) => ({ ...d, [key]: value }));

  const saveEdit = async (p) => {
    setBusyId(p.id);
    setRowMsg((s) => ({ ...s, [p.id]: null }));
    try {
      const updated = await api.patch(`/api/products/${p.id}`, {
        ...editDraft,
        warrantyMonths: Number(editDraft.warrantyMonths),
      });
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, ...updated } : x)));
      setRowMsg((s) => ({ ...s, [p.id]: { type: 'ok', text: 'Saved.' } }));
      cancelEdit();
    } catch (err) {
      setRowMsg((s) => ({ ...s, [p.id]: { type: 'err', text: err.message } }));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setBusyId(p.id);
    try {
      await api.del(`/api/products/${p.id}`);
      setProducts((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      setRowMsg((s) => ({ ...s, [p.id]: { type: 'err', text: err.message } }));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner label="Loading products..." />;
  if (error) return <div className="error-message" role="alert">{error}</div>;

  return (
    <div className="container-md">
      <details style={{
        background: '#f4f6f8', borderRadius: 8, padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
      }}>
        <summary style={{ fontWeight: 600, cursor: 'pointer' }}>+ Add new product</summary>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12 }}>
          <input className="form-input" placeholder="Code (e.g. CS 500)" value={draft.code} onChange={(e) => setField('code', e.target.value)} required />
          <input className="form-input" placeholder="Name" value={draft.name} onChange={(e) => setField('name', e.target.value)} required />
          <textarea className="form-input" placeholder="Description" value={draft.description} onChange={(e) => setField('description', e.target.value)} rows={2} style={{ gridColumn: 'span 2' }} required />
          <input className="form-input" type="number" step="0.01" min="0" placeholder="Price" value={draft.price} onChange={(e) => setField('price', e.target.value)} required />
          <input className="form-input" type="number" step="0.01" min="0" placeholder="Cost" value={draft.cost} onChange={(e) => setField('cost', e.target.value)} />
          <select className="form-input" value={draft.category} onChange={(e) => setField('category', e.target.value)} required>
            <option value="">Select category…</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="form-input" placeholder="Serial number" value={draft.serialNumber} onChange={(e) => setField('serialNumber', e.target.value)} required />
          <input className="form-input" type="number" min="0" placeholder="Quantity in stock" value={draft.quantityInStock} onChange={(e) => setField('quantityInStock', e.target.value)} required />
          <input className="form-input" type="number" min="0" placeholder="Warranty (months)" value={draft.warrantyMonths} onChange={(e) => setField('warrantyMonths', e.target.value)} required />
          <input className="form-input" placeholder="Distributor info" value={draft.distributorInfo} onChange={(e) => setField('distributorInfo', e.target.value)} required />
          <input className="form-input" placeholder="Model" value={draft.model} onChange={(e) => setField('model', e.target.value)} required />
          <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Saving…' : 'Create product'}
            </button>
            {createMsg && (
              <span style={{ color: createMsg.type === 'ok' ? '#0c7' : '#c33' }}>{createMsg.text}</span>
            )}
          </div>
        </form>
      </details>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Code / Name</th>
            <th style={{ padding: 8 }}>Category</th>
            <th style={{ padding: 8 }}>Price</th>
            <th style={{ padding: 8 }}>Stock</th>
            <th style={{ padding: 8, width: 260 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const isEditing = editingId === p.id;
            return (
              <tr key={p.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8 }}>
                  {isEditing ? (
                    <>
                      <input className="form-input" style={{ width: 110 }} value={editDraft.code} onChange={(e) => setEditField('code', e.target.value)} />
                      <input className="form-input" style={{ width: '100%', marginTop: 4 }} value={editDraft.name} onChange={(e) => setEditField('name', e.target.value)} />
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600 }}>{p.code}</div>
                      <div style={{ color: '#666' }}>{p.name}</div>
                    </>
                  )}
                </td>
                <td style={{ padding: 8 }}>
                  {isEditing ? (
                    <select value={editDraft.category} onChange={(e) => setEditField('category', e.target.value)}>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : p.category}
                </td>
                <td style={{ padding: 8 }}>{Number(p.price).toFixed(2)} ₺</td>
                <td style={{ padding: 8 }}>{p.quantityInStock ?? p.stock ?? 0}</td>
                <td style={{ padding: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                  {isEditing ? (
                    <>
                      <button type="button" className="btn btn-primary" disabled={busyId === p.id} onClick={() => saveEdit(p)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                        Save
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={cancelEdit} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-secondary" onClick={() => startEdit(p)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-danger" disabled={busyId === p.id} onClick={() => remove(p)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                        Delete
                      </button>
                    </>
                  )}
                  {rowMsg[p.id] && (
                    <span style={{ color: rowMsg[p.id].type === 'ok' ? '#0c7' : '#c33', fontSize: '0.8rem' }}>{rowMsg[p.id].text}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
