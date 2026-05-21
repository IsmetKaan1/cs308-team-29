import { useEffect, useState } from 'react';
import { api } from '../api';
import Spinner from './Spinner';

export default function PricingPanel() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [savingIds, setSavingIds] = useState({});
  const [feedback, setFeedback] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [bulkRate, setBulkRate] = useState('10');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/products');
      setProducts(data);
      setDrafts(Object.fromEntries(data.map((p) => [
        p.id,
        {
          price: String(p.price ?? ''),
          cost: String(p.cost ?? 0),
          discountRate: String(p.discountRate ?? 0),
        },
      ])));
    } catch (err) {
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setDraft = (id, key, value) => {
    setDrafts((s) => ({ ...s, [id]: { ...s[id], [key]: value } }));
  };

  const savePricing = async (product) => {
    const d = drafts[product.id] || {};
    const price = Number(d.price);
    const cost = Number(d.cost);
    if (!Number.isFinite(price) || price < 0) {
      setFeedback((s) => ({ ...s, [product.id]: { type: 'err', text: 'Price must be ≥ 0.' } }));
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setFeedback((s) => ({ ...s, [product.id]: { type: 'err', text: 'Cost must be ≥ 0.' } }));
      return;
    }
    setSavingIds((s) => ({ ...s, [product.id]: true }));
    try {
      const updated = await api.patch(`/api/products/${product.id}/pricing`, { price, cost });
      setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, ...updated } : p)));
      setFeedback((s) => ({ ...s, [product.id]: { type: 'ok', text: 'Saved.' } }));
    } catch (err) {
      setFeedback((s) => ({ ...s, [product.id]: { type: 'err', text: err.message } }));
    } finally {
      setSavingIds((s) => ({ ...s, [product.id]: false }));
    }
  };

  const applyIndividualDiscount = async (product) => {
    const d = drafts[product.id] || {};
    const rate = Number(d.discountRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 90) {
      setFeedback((s) => ({ ...s, [product.id]: { type: 'err', text: 'Rate must be 0–90.' } }));
      return;
    }
    setSavingIds((s) => ({ ...s, [product.id]: true }));
    try {
      const data = await api.post('/api/products/discount', {
        productIds: [product.id],
        discountRate: rate,
      });
      const result = data.results?.[0];
      setProducts((list) => list.map((p) => (
        p.id === product.id
          ? { ...p, discountRate: rate, discountedPrice: result?.discountedPrice ?? p.discountedPrice }
          : p
      )));
      const notified = result?.notified || 0;
      setFeedback((s) => ({
        ...s,
        [product.id]: { type: 'ok', text: rate > 0
          ? `Discount applied. Notified ${notified} wishlist user(s).`
          : 'Discount cleared.' },
      }));
    } catch (err) {
      setFeedback((s) => ({ ...s, [product.id]: { type: 'err', text: err.message } }));
    } finally {
      setSavingIds((s) => ({ ...s, [product.id]: false }));
    }
  };

  const toggleSelect = (id) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const applyBulk = async () => {
    if (selected.size === 0) return;
    const rate = Number(bulkRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 90) {
      setBulkResult({ type: 'err', text: 'Rate must be 0–90.' });
      return;
    }
    setBulkBusy(true);
    setBulkResult(null);
    try {
      const data = await api.post('/api/products/discount', {
        productIds: [...selected],
        discountRate: rate,
      });
      const totalNotified = data.results.reduce((s, r) => s + (r.notified || 0), 0);
      setBulkResult({
        type: 'ok',
        text: `Discount ${rate}% applied to ${data.updated} product(s). Notified ${totalNotified} wishlist user(s).`,
      });
      await load();
      setSelected(new Set());
    } catch (err) {
      setBulkResult({ type: 'err', text: err.message });
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading products..." />;
  if (error) return <div className="error-message" role="alert">{error}</div>;

  return (
    <div className="container-md">
      <div style={{ background: '#f4f6f8', borderRadius: 8, padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ marginTop: 0 }}>Bulk discount</h3>
        <p style={{ color: 'var(--color-ink-500)', marginTop: 0 }}>
          Select products from the table, choose a rate, then apply. Users whose wishlist
          contains a discounted product will be emailed automatically.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Rate (%):
            <input
              type="number"
              min={0}
              max={90}
              step={1}
              value={bulkRate}
              onChange={(e) => setBulkRate(e.target.value)}
              style={{ marginLeft: 8, width: 80, padding: 4 }}
            />
          </label>
          <span>Selected: <strong>{selected.size}</strong></span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={bulkBusy || selected.size === 0}
            onClick={applyBulk}
          >
            {bulkBusy ? 'Applying...' : 'Apply discount'}
          </button>
          {bulkResult && (
            <span style={{ color: bulkResult.type === 'ok' ? '#0c7' : '#c33' }}>{bulkResult.text}</span>
          )}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
            <th style={{ padding: 8, width: 32 }}></th>
            <th style={{ padding: 8 }}>Code / Name</th>
            <th style={{ padding: 8, width: 110 }}>Price (₺)</th>
            <th style={{ padding: 8, width: 110 }}>Cost (₺)</th>
            <th style={{ padding: 8, width: 110 }}>Discount %</th>
            <th style={{ padding: 8, width: 110 }}>Net Price</th>
            <th style={{ padding: 8, width: 220 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const d = drafts[p.id] || { price: '', cost: '', discountRate: '' };
            const net = (() => {
              const price = Number(d.price) || 0;
              const rate = Number(d.discountRate) || 0;
              return Math.round(price * (100 - rate)) / 100;
            })();
            const fb = feedback[p.id];
            return (
              <tr key={p.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  <div style={{ fontWeight: 600 }}>{p.code}</div>
                  <div style={{ color: '#666' }}>{p.name}</div>
                </td>
                <td style={{ padding: 8 }}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={d.price}
                    onChange={(e) => setDraft(p.id, 'price', e.target.value)}
                    style={{ width: '100%', padding: 4 }}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={d.cost}
                    onChange={(e) => setDraft(p.id, 'cost', e.target.value)}
                    style={{ width: '100%', padding: 4 }}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    step={1}
                    value={d.discountRate}
                    onChange={(e) => setDraft(p.id, 'discountRate', e.target.value)}
                    style={{ width: '100%', padding: 4 }}
                  />
                </td>
                <td style={{ padding: 8 }}>{net.toFixed(2)} ₺</td>
                <td style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={!!savingIds[p.id]}
                      onClick={() => savePricing(p)}
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      Save price/cost
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!!savingIds[p.id]}
                      onClick={() => applyIndividualDiscount(p)}
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      Apply discount
                    </button>
                  </div>
                  {fb && (
                    <span style={{ color: fb.type === 'ok' ? '#0c7' : '#c33', fontSize: '0.8rem' }}>
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
  );
}
