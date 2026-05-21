import { useEffect, useState } from 'react';
import { api } from '../api';

const cache = new Map();
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn();
}

async function loadWishlist() {
  try {
    const items = await api.get('/api/wishlist');
    cache.clear();
    for (const it of items) cache.set(String(it.productId), true);
    notify();
  } catch {
    // unauthenticated or offline — wishlist stays empty
  }
}

let hydrated = false;
function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  const token = typeof window !== 'undefined' && localStorage.getItem('token');
  if (token) loadWishlist();
}

if (typeof window !== 'undefined') {
  window.addEventListener('authChange', () => {
    cache.clear();
    hydrated = false;
    notify();
    ensureHydrated();
  });
}

export default function WishlistButton({ productId, compact = false }) {
  ensureHydrated();
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  const loggedIn = typeof window !== 'undefined' && !!localStorage.getItem('token');
  const inWishlist = cache.has(String(productId));

  if (!loggedIn) return null;

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    setError('');
    try {
      if (inWishlist) {
        await api.del(`/api/wishlist/${productId}`);
        cache.delete(String(productId));
      } else {
        await api.post('/api/wishlist', { productId });
        cache.set(String(productId), true);
      }
      notify();
    } catch (err) {
      setError(err.message || 'Wishlist update failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: busy ? 'wait' : 'pointer',
        fontSize: compact ? '1.1rem' : '1.4rem',
        color: inWishlist ? '#e0245e' : '#999',
        padding: compact ? 2 : 4,
        lineHeight: 1,
      }}
    >
      {inWishlist ? '♥' : '♡'}
      {error && <span style={{ display: 'none' }}>{error}</span>}
    </button>
  );
}
