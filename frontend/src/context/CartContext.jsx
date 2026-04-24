import { useReducer, useEffect, useState } from 'react';
import { api } from '../api';
import { CartContext } from './cartStore';

function calcTotals(items) {
  return {
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
}

function cartReducer(state, action) {
  let items;

  switch (action.type) {
    case 'SET_CART':
      items = action.items;
      return { ...state, items, ...calcTotals(items) };

    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.id === action.product.id);
      if (existing) {
        items = state.items.map((i) =>
          i.id === action.product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        items = [...state.items, { ...action.product, quantity: 1 }];
      }
      return { ...state, items, ...calcTotals(items) };
    }

    case 'REMOVE_ITEM':
      items = state.items.filter((i) => i.id !== action.id);
      return { ...state, items, ...calcTotals(items) };

    case 'INCREMENT':
      items = state.items.map((i) =>
        i.id === action.id ? { ...i, quantity: i.quantity + 1 } : i
      );
      return { ...state, items, ...calcTotals(items) };

    case 'DECREMENT':
      items = state.items
        .map((i) => (i.id === action.id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);
      return { ...state, items, ...calcTotals(items) };

    case 'CLEAR_CART':
      return { ...state, items: [], totalItems: 0, totalPrice: 0 };

    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen };

    case 'CLOSE_CART':
      return { ...state, isOpen: false };

    default:
      return state;
  }
}

const initialState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isOpen: false,
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    function loadCart() {
      if (localStorage.getItem('token')) {
        api.get('/api/cart')
          .then(cart => {
            dispatch({ type: 'SET_CART', items: cart.items || [] });
            setIsLoaded(true);
          })
          .catch(() => setIsLoaded(true));
      } else {
        dispatch({ type: 'CLEAR_CART' });
        setIsLoaded(true);
      }
    }
    loadCart();
    
    window.addEventListener('authChange', loadCart);
    return () => window.removeEventListener('authChange', loadCart);
  }, []);

  useEffect(() => {
    if (isLoaded && localStorage.getItem('token')) {
       // Debounce or directly save
       api.post('/api/cart', { items: state.items }).catch(console.error);
    }
  }, [state.items, isLoaded]);

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
}
