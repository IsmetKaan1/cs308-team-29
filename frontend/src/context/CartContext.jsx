import { useReducer, useEffect, useState } from 'react';
import { api } from '../api';
import { CartContext } from './cartStore';
import { cartReducer, initialCartState } from './cartReducer';

const GUEST_CART_KEY = 'guestCart';

function readGuestCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeCartItems(serverItems = [], guestItems = []) {
  const byId = new Map();
  for (const item of [...serverItems, ...guestItems]) {
    if (!item?.id) continue;
    const existing = byId.get(item.id);
    if (existing) {
      byId.set(item.id, { ...existing, quantity: existing.quantity + item.quantity });
    } else {
      byId.set(item.id, { ...item });
    }
  }
  return [...byId.values()];
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    function loadCart() {
      if (localStorage.getItem('token')) {
        api.get('/api/cart')
          .then(cart => {
            const guestItems = readGuestCart();
            const mergedItems = mergeCartItems(cart.items || [], guestItems);
            dispatch({ type: 'SET_CART', items: mergedItems });
            if (guestItems.length) {
              localStorage.removeItem(GUEST_CART_KEY);
              api.post('/api/cart', { items: mergedItems }).catch(console.error);
            }
            setIsLoaded(true);
          })
          .catch(() => setIsLoaded(true));
      } else {
        dispatch({ type: 'SET_CART', items: readGuestCart() });
        setIsLoaded(true);
      }
    }
    loadCart();

    window.addEventListener('authChange', loadCart);
    return () => window.removeEventListener('authChange', loadCart);
  }, []);

  useEffect(() => {
    if (isLoaded && localStorage.getItem('token')) {
       api.post('/api/cart', { items: state.items }).catch(console.error);
    } else if (isLoaded) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(state.items));
    }
  }, [state.items, isLoaded]);

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
}
